#ifndef MINIMAX_H
#define MINIMAX_H

#include <assert.h>
#include <type_traits>
#include <array>

#include "bitboard.h"
#include "turnstate.h"

template <unsigned int board_rad>
class MiniMax {
public:
    static constexpr unsigned int board_diam = board_rad * 2 + 1;
    static constexpr unsigned int board_width = board_diam + 1;
    static constexpr unsigned int board_height = board_diam;
    static constexpr unsigned int num_cells = board_width * board_height;

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

    class Board {
    public:
        SizedBitBoard empties;
        SizedBitBoard pieces;
        SizedBitBoard teammates;
        std::array<unsigned int, 2> kings;

        Board move(unsigned int src, unsigned int dst) const {
            assert(!empties.test(src));
            assert(teammates.test(src));
            assert(pieces.test(src));
            assert(empties.test(dst));
            assert(!teammates.test(dst));
            assert(!pieces.test(dst));
            assert(dst != kings[1]);

            SizedBitBoard flip = SizedBitBoard::from_bits(src, dst);
            Board res = Board{empties ^ flip, pieces ^ flip, teammates ^ flip, kings};
            if (res.kings[0] == src) {res.kings[0] = dst;}
            return res;
        }

        Board jump(unsigned int src, unsigned int dst) const {
            assert(!empties.test(src));
            assert(teammates.test(src));
            assert(pieces.test(src));
            assert(!empties.test(dst));
            assert(!teammates.test(dst));
            assert(pieces.test(dst));
            assert(dst != kings[1]);

            SizedBitBoard flip_1 = SizedBitBoard::from_bits(src);
            SizedBitBoard flip_2 = SizedBitBoard::from_bits(src, dst);
            Board res = Board{empties ^ flip_1, pieces ^ flip_1, teammates ^ flip_2, kings};
            if (res.kings[0] == src) {res.kings[0] = dst;}
            return res;
        }

        Board flip_teams() const {
            return Board{empties, pieces, pieces ^ teammates, {kings[1], kings[0]}};
        }

        template <bool flip_teams = false>
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

                if (i == kings[0 ^ flip_teams]) {res += 'O';}
                else if (i == kings[1 ^ flip_teams]) {res += 'X';}
                else if (pieces.test(i)) {
                    if (teammates.test(i) ^ flip_teams) {res += 'o';}
                    else {res += 'x';}
                }
                else if (empties.test(i)) {res += '+';}
                else {res += '.';}

                res += ' ';

                if (col == board_width - 1) {
                    res += '\n';
                }
            }

            return res;
        }
    };

    MiniMax()
        : alpha(-init_score)
        , beta(init_score)
    {}

    MiniMax(signed int alpha, signed int beta)
        : alpha(alpha)
        , beta(beta)
    {}

    signed int calc_score(const Board board) {
        update<TurnState_Initial>(board);
        return score;
    }

    static unsigned int lookup_cell_id(unsigned int row, unsigned int col) {
        return row * board_width + col;
    }

private:
    signed int score = init_score;
    signed int alpha;
    signed int beta;

    bool score_child(const Board board) {
        signed int child_score = -MiniMax<board_rad>(-beta, -alpha).calc_score(board.flip_teams());
        if (child_score > score) {
            score = child_score;
            if (child_score > alpha) {
                alpha = child_score;
                if (alpha >= beta) {return true;}
            }
        }
        return false;
    }

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

            // Check if our king can jump any piece
            SizedBitBoard jumps = SizedBitBoard::from_bits(board.kings[0]);
            jumps |= jumps.template shift<dir_offsets[0]>();
            jumps |= jumps.template shift<dir_offsets[2]>();
            jumps |= jumps.template shift<dir_offsets[4]>();
            jumps &= board.pieces;
            jumps &= ~board.teammates;

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
        SizedBitBoard moves = board.teammates & board.empties.template shift<dir_offsets[dir + 3]>();
        SizedBitBoard gliders = moves
            & board.teammates.template shift<dir_offsets[dir + 5]>()
            & board.teammates.template shift<dir_offsets[dir + 1]>();

        if (TurnState::can_move) {
            typename SizedBitBoard::FastBitEater i;
            while (moves.has_bit(i)) {
                unsigned int old_pos = moves.pop_bit(i);
                unsigned int new_pos = old_pos + dir_offsets[dir];
                if (update<typename TurnState::AfterMove>(board.move(old_pos, new_pos))) {return true;}
            }
        }

        if (TurnState::can_glide) {
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
                    if (update<typename TurnState::AfterJump>(board.move(old_pos, new_pos))) {return true;}
                }
            }
        }

        return false;
    }
};

#endif // MINIMAX_H
