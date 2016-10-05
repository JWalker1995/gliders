#ifndef MINIMAX_H
#define MINIMAX_H

#include <iostream>
#include <assert.h>
#include <type_traits>
#include <array>
#include <string>
#include <unordered_map>

#include "bitboard.h"
#include "turnstate.h"
#include "actionlog.h"

#include "jw_util/hash.h"

template <unsigned int board_rad, bool save_actions>
class MiniMax : public std::conditional<save_actions, ActionLog, DummyActionLog>::type {
public:
    static constexpr unsigned int board_diam = board_rad * 2 + 1;
    static constexpr unsigned int board_width = board_diam + 1;
    static constexpr unsigned int board_height = board_diam;
    static constexpr unsigned int num_cells = board_width * board_height;

    static constexpr signed int flag_score = 1000000001;
    static constexpr signed int init_score = 1000000000;
    static constexpr signed int win_score = 1000000;

    static constexpr signed int dir_offsets[] = {
        -static_cast<signed int>(board_width) + 1,
        1,
        static_cast<signed int>(board_width),
        static_cast<signed int>(board_width) - 1,
        -1,
        -static_cast<signed int>(board_width),
        -static_cast<signed int>(board_width) + 1,
        1,
        static_cast<signed int>(board_width),
        static_cast<signed int>(board_width) - 1,
        -1,
        -static_cast<signed int>(board_width),
    };

    typedef BitBoard<num_cells> SizedBitBoard;

    class Board : public std::conditional<save_actions, ActionLog, DummyActionLog>::type {
    public:
        Board() {}

        Board(
            SizedBitBoard empties,
            SizedBitBoard pieces,
            SizedBitBoard teammates,
            std::array<unsigned int, 2> kings,
            std::array<unsigned int, 2> spawns
        )
            : empties(empties)
            , pieces(pieces)
            , teammates(teammates)
            , kings(kings)
            , spawns(spawns)
        {}

        SizedBitBoard empties;
        SizedBitBoard pieces;
        SizedBitBoard teammates;
        std::array<unsigned int, 2> kings;
        std::array<unsigned int, 2> spawns;

        struct Hasher {
            std::size_t operator()(const Board &board) const {
                return board.calc_hash();
            }
        };

        bool operator==(const Board &other) const {
            return pieces == other.pieces && teammates == other.teammates && kings == other.kings && spawns == other.spawns;
        }

        Board move(unsigned int src, unsigned int dst) const {
            assert(!empties.test(src));
            assert(teammates.test(src));
            assert(pieces.test(src));
            assert(empties.test(dst));
            assert(!teammates.test(dst));
            assert(!pieces.test(dst));

            SizedBitBoard flip = SizedBitBoard::from_bits(src, dst);
            Board res = Board(empties ^ flip, pieces ^ flip, teammates ^ flip, kings, spawns);
            if (res.kings[0] == src) {res.kings[0] = dst;}

            this->copy_actions_to(res);
            res.add_action(ActionType::Move, src, dst);

            return res;
        }

        Board jump(unsigned int src, unsigned int dst) const {
            assert(!empties.test(src));
            assert(teammates.test(src));
            assert(pieces.test(src));
            assert(!empties.test(dst));
            assert(!teammates.test(dst));
            assert(pieces.test(dst));

            SizedBitBoard flip_1 = SizedBitBoard::from_bits(src);
            SizedBitBoard flip_2 = SizedBitBoard::from_bits(src, dst);
            Board res = Board(empties ^ flip_1, pieces ^ flip_1, teammates ^ flip_2, kings, spawns);
            if (res.kings[0] == src) {res.kings[0] = dst; res.spawns[0]++;}

            this->copy_actions_to(res);
            res.add_action(ActionType::Jump, src, dst);

            return res;
        }

        Board glide(unsigned int src, unsigned int dst) const {
            assert(!empties.test(src));
            assert(teammates.test(src));
            assert(pieces.test(src));
            assert(empties.test(dst));
            assert(!teammates.test(dst));
            assert(!pieces.test(dst));

            SizedBitBoard flip = SizedBitBoard::from_bits(src, dst);
            Board res = Board(empties ^ flip, pieces ^ flip, teammates ^ flip, kings, spawns);
            if (res.kings[0] == src) {res.kings[0] = dst;}

            this->copy_actions_to(res);
            res.add_action(ActionType::Glide, src, dst);

            return res;
        }

        Board spawn(unsigned int dst) const {
            assert(empties.test(dst));
            assert(!teammates.test(dst));
            assert(!pieces.test(dst));

            SizedBitBoard flip = SizedBitBoard::from_bits(dst);
            Board res = Board(empties ^ flip, pieces ^ flip, teammates ^ flip, kings, {spawns[0] - 1, spawns[1]});

            this->copy_actions_to(res);
            res.add_action(ActionType::Spawn, 0, dst);

            return res;
        }

        template <typename BoardType>
        BoardType flip_teams() const {
            return BoardType(empties, pieces, pieces ^ teammates, {kings[1], kings[0]}, {spawns[1], spawns[0]});
        }

        signed int calc_score() const {
            return teammates.count_set_bits() * 2 - pieces.count_set_bits();
        }

        std::size_t calc_hash() const {
            std::size_t res = empties.calc_hash();
            res = jw_util::Hash::combine(res, pieces.calc_hash());
            res = jw_util::Hash::combine(res, teammates.calc_hash());
            res = jw_util::Hash::combine(res, (kings[0] << 24) | (kings[1] << 16) | (spawns[0] << 8) | spawns[1]);
            return res;
        }

        std::string to_string() const {
            std::string res;

            for (unsigned int i = 0; i < num_cells; i++) {
                unsigned int row = i / board_width;
                unsigned int col = i % board_width;

                if (col == 0) {
                    for (unsigned int j = 0; j < row; j++) {
                        res += ' ';
                    }

                    res += '0' + (i / 100) % 10;
                    res += '0' + (i / 10) % 10;
                    res += '0' + (i / 1) % 10;
                    res += ' ';
                }

                if (i == kings[0]) {res += 'O';}
                else if (i == kings[1]) {res += 'X';}
                else if (pieces.test(i)) {
                    if (teammates.test(i)) {res += 'o';}
                    else {res += 'x';}
                }
                else if (empties.test(i)) {res += '+';}
                else {res += '.';}

                res += ' ';

                if (col == board_width - 1) {
                    res += '\n';
                }
            }

            res += "O spn " + std::to_string(spawns[0]) + "\n";
            res += "X spn " + std::to_string(spawns[1]) + "\n";

            return res;
        }
    };

    MiniMax(unsigned int depth)
        : alpha(-init_score)
        , beta(init_score)
        , depth(depth - 1)
    {}

    MiniMax(signed int alpha, signed int beta, unsigned int depth)
        : alpha(alpha)
        , beta(beta)
        , depth(depth - 1)
    {}

    signed int calc_score(const Board board) {
        if (depth == 0) {
            return board.calc_score();
        } else {
            CacheScore &cache_score = cache[board];
            if (cache_score.score == flag_score) {
                score = -init_score;
                update<TurnState_Initial>(board);
                cache_score.score = score;
                return score;
            } else {
                return cache_score.score;
            }
        }
    }

    static unsigned int lookup_cell_id(unsigned int row, unsigned int col) {
        return row * board_width + col;
    }

private:
    signed int score;
    signed int alpha;
    signed int beta;
    unsigned int depth;

    struct CacheScore {
        signed int score = flag_score;
    };
    static std::unordered_map<Board, CacheScore, typename Board::Hasher> cache;

    // Move: empty
    // Jump: enemy king
    // Gliders: teammate (wings), empty or void (back), empty (flying), enemy (land)
    // Spawn: self king, same as jump

    /*
    DataType calc_hash() {
        DataType hash = 0;
        hash = teammates.calc_hash(hash);
        hash = pieces.calc_hash(hash);
        hash = jw_util::Hash::combine(hash, kings[0] << 16 | kings[1]);
        return hash;
    }
    */

    template <typename TurnState>
    bool update(const Board board) {
        std::cout << board.to_string() << std::endl;

        if (TurnState::can_end) {
            typedef typename MiniMax<board_rad, false>::Board FlippedBoardType;
            signed int child_score = -MiniMax<board_rad, false>(-beta, -alpha, depth).calc_score(board.template flip_teams<FlippedBoardType>());
            if (child_score > score) {
                score = child_score;
                board.copy_actions_to(*this);
                if (child_score > alpha) {
                    alpha = child_score;
                    if (alpha >= beta) {return true;}
                }
            }
        }

        if (TurnState::can_jump) {
            // Check if any of our pieces can jump the enemy king
            SizedBitBoard jumpers = SizedBitBoard::from_bits(board.kings[1]);
            jumpers |= jumpers.template shift<dir_offsets[0]>();
            jumpers |= jumpers.template shift<dir_offsets[2]>();
            jumpers |= jumpers.template shift<dir_offsets[4]>();
            jumpers &= board.teammates;
            if (jumpers.has_bit()) {
                score = win_score;
                return true;
            }

            // Find all cells next to our king
            SizedBitBoard king_prox = SizedBitBoard::from_bits(board.kings[0]);
            king_prox |= king_prox.template shift<dir_offsets[0]>();
            king_prox |= king_prox.template shift<dir_offsets[2]>();
            king_prox |= king_prox.template shift<dir_offsets[4]>();

            if (TurnState::can_spawn && board.spawns[0] > 0) {
                // Check if our king can spawn a piece
                SizedBitBoard spawns = king_prox & board.empties;
                typename SizedBitBoard::FastBitEater i;
                while (spawns.has_bit(i)) {
                    unsigned int new_pos = spawns.pop_bit(i);
                    if (update<typename TurnState::AfterSpawn>(board.spawn(new_pos))) {return true;}
                }
            }

            // Check if our king can jump any piece
            SizedBitBoard jumps = king_prox & board.pieces & ~board.teammates;
            typename SizedBitBoard::FastBitEater i;
            while (jumps.has_bit(i)) {
                unsigned int old_pos = board.kings[0];
                unsigned int new_pos = jumps.pop_bit(i);
                if (update<typename TurnState::AfterJump>(board.jump(old_pos, new_pos))) {return true;}
            }
        }

        if (score_dir<0, TurnState>(board)) {return true;}
        if (score_dir<1, TurnState>(board)) {return true;}
        if (score_dir<2, TurnState>(board)) {return true;}
        if (score_dir<3, TurnState>(board)) {return true;}
        if (score_dir<4, TurnState>(board)) {return true;}
        if (score_dir<5, TurnState>(board)) {return true;}

        return false;
    }

    template <unsigned int dir, typename TurnState>
    bool score_dir(const Board board) {
        SizedBitBoard moves;
        if (TurnState::can_move || TurnState::can_glide) {
            moves = board.teammates & board.empties.template shift<dir_offsets[dir + 3]>();
        }

        if (TurnState::can_glide) {
            SizedBitBoard gliders = moves
                & board.teammates.template shift<dir_offsets[dir + 5]>()
                & board.teammates.template shift<dir_offsets[dir + 1]>();

            if (!TurnState::try_move_after_glide) {
                moves &= ~gliders;
            }

            typename SizedBitBoard::FastBitEater i;
            while (gliders.has_bit(i)) {
                unsigned int old_pos = gliders.pop_bit(i);
                unsigned int new_pos = old_pos;

                while (true) {
                    new_pos += dir_offsets[dir];
                    if (!board.empties.test(new_pos)) {
                        if (board.pieces.test(new_pos) && !board.teammates.test(new_pos)) {
                            // Capture enemy piece
                            if (update<typename TurnState::AfterJump>(board.jump(old_pos, new_pos))) {return true;}
                        }
                        break;
                    }
                    if (update<typename TurnState::AfterJump>(board.glide(old_pos, new_pos))) {return true;}
                }
            }
        }

        if (TurnState::can_move) {
            typename SizedBitBoard::FastBitEater i;
            while (moves.has_bit(i)) {
                unsigned int old_pos = moves.pop_bit(i);
                unsigned int new_pos = old_pos + dir_offsets[dir];
                if (update<typename TurnState::AfterMove>(board.move(old_pos, new_pos))) {return true;}
            }
        }

        return false;
    }
};

#endif // MINIMAX_H
