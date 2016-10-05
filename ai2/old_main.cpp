/*
Feb 10 2010
March 10 2016
Sep 22 2016
*/

#include <iostream>
#include <limits>
#include <functional>
#include <type_traits>
#include <array>

#include "jw_util/fastmath.h"

template <unsigned int moves, unsigned int shoots, unsigned int spawns, bool ends>
class TurnState {
private:
    static constexpr unsigned int use_1(unsigned int prev) {
        return prev ? prev - 1 : 0;
    }

public:
    static constexpr bool can_move = moves;
    static constexpr bool can_shoot = shoots;
    static constexpr bool can_spawn = spawns;
    static constexpr bool can_end = ends;

    static constexpr bool must_end = !can_move && !can_shoot && !can_spawn;

    typedef TurnState<use_1(moves), 0, 0, true> AfterMove;
    typedef TurnState<0, use_1(shoots), spawns, true> AfterShoot;
    typedef TurnState<0, 0, use_1(spawns), false> AfterSpawn;
};

typedef TurnState<1, 1, 1, false> TurnState_Initial;


template <unsigned int board_rad, unsigned int max_team_size>
class BoardState {
private:
    static constexpr unsigned int board_diam = board_rad * 2 + 1;
    static constexpr unsigned int cells_width = board_diam + 1;

public:
    enum Direction {UpLeft = 0, UpRight = 1, Right = 2, DownRight = 3, DownLeft = 4, Left = 5};

    struct Cell {
        static constexpr unsigned char void_flag = 254;
        static constexpr unsigned char empty_flag = 255;

        unsigned char value = void_flag;

        bool is_void() const {return value == void_flag;}
        bool is_empty() const {return value == empty_flag;}

        bool is_piece() const {return value < void_flag;}

        template <bool team_id>
        bool is_team() const {
            return value >= (max_team_size * team_id) && value < (max_team_size * (team_id + 1));
        }

        template <bool team_id>
        bool is_king() const {
            return value == max_team_size * team_id;
        }
    };

    struct Piece {
        unsigned int cell_id;
    };

    static constexpr signed int dir_offsets[12] = {
        -static_cast<signed int>(cells_width),
        -static_cast<signed int>(cells_width) + 1,
        1,
        static_cast<signed int>(cells_width),
        static_cast<signed int>(cells_width) - 1,
        -1,
        -static_cast<signed int>(cells_width),
        -static_cast<signed int>(cells_width) + 1,
        1,
        static_cast<signed int>(cells_width),
        static_cast<signed int>(cells_width) - 1,
        -1,
    };

    static unsigned int calc_cell_id(unsigned int row, unsigned int col) {
        return row * cells_width + col;
    }

    BoardState()
        : team_sizes {0, 0}
    {}

    void flood_fill_empty(unsigned int cell_id, unsigned int rad) {
        get_cell(cell_id).value = Cell::empty_flag;

        if (rad > 0) {
            for (unsigned int i = 0; i < 6; i++) {
                flood_fill_empty(cell_id + dir_offsets[i], rad - 1);
            }
        }
    }

    template <bool team_id>
    void init_piece(unsigned int row, unsigned int col) {
        unsigned int cell_id = calc_cell_id(row, col);
        get_cell(cell_id).value = add_piece<team_id>(cell_id);
    }

    Cell &get_cell(unsigned int cell_id) {
        assert(cell_id < cells.size());
        return cells[cell_id];
    }
    Piece &get_piece(unsigned int piece_id) {
        assert(piece_id < pieces.size());
        return pieces[piece_id];
    }

    template <bool team_id>
    Piece *pieces_begin() {
        return pieces.data() + (max_team_size * team_id);
    }
    template <bool team_id>
    Piece *pieces_end() {
        return pieces.data() + (max_team_size * team_id) + team_sizes[team_id];
    }

    template <bool team_id>
    unsigned int add_piece(unsigned int cell_id) {
        Piece *piece = pieces_end<team_id>();
        piece->cell_id = cell_id;

        team_sizes[team_id]++;
        assert(team_sizes[team_id] <= max_team_size);

        return piece - pieces.data();
    }

    template <bool team_id>
    void remove_piece(Piece &piece) {
        team_sizes[team_id]--;
        piece = pieces[team_sizes[team_id]];
    }
    template <bool team_id>
    void replace_piece(Piece &piece, unsigned int cell_id) {
        pieces[team_sizes[team_id]] = piece;
        team_sizes[team_id]++;
        piece.cell_id = cell_id;
    }

    signed int calc_score() const {
        return team_sizes[1] - team_sizes[0];
    }

    std::string to_string() {
        std::string res;
        unsigned int i = 0;
        while (i < cells.size()) {
            unsigned int row = i / cells_width;
            unsigned int col = i % cells_width;

            if (col == 0) {
                for (unsigned int j = 0; j < row; j++) {
                    res += ' ';
                }

                res += '0' + (i / 100) % 10;
                res += '0' + (i / 10) % 10;
                res += '0' + (i / 1) % 10;
                res += ' ';
            }

            Cell &cell = get_cell(i);
            if (cell.is_void()) {res += '.';}
            else if (cell.is_empty()) {res += '+';}
            else if (cell.template is_king<false>()) {res += 'O';}
            else if (cell.template is_king<true>()) {res += 'X';}
            else if (cell.template is_team<false>()) {res += 'o';}
            else if (cell.template is_team<true>()) {res += 'x';}
            else {assert(false);}

            res += ' ';

            i++;
            if (col == cells_width - 1) {
                res += '\n';
            }
        }

        return res;
    }

private:
    std::array<Cell, cells_width * (board_diam + 2)> cells;
    std::array<Piece, max_team_size * 2> pieces;
    std::array<unsigned int, 2> team_sizes;
};

template <unsigned int board_rad, unsigned int max_team_size>
constexpr signed int BoardState<board_rad, max_team_size>::dir_offsets[];


template <unsigned int board_rad, unsigned int max_team_size>
class MiniMax {
private:
    typedef BoardState<board_rad, max_team_size> State;

public:
    // Minimize the score for team 0
    // Maximize the score for team 1
    template <bool team_id, typename TurnState>
    static signed int score_setup(State &state, signed int alpha, signed int beta, unsigned int depth) {
        std::cout << state.to_string() << std::endl;

        if (depth == 0) {
            return state.calc_score();
        } else if (TurnState::must_end) {
            assert(TurnState::can_end);
            return score_setup<!team_id, TurnState_Initial>(state, beta, alpha, depth - 1);
        }

        typename std::conditional<team_id, std::greater<signed int>, std::less<signed int>>::type exclusive_cmp;
        typename std::conditional<team_id, std::greater_equal<signed int>, std::less_equal<signed int>>::type inclusive_cmp;

        signed int score = team_id ? std::numeric_limits<signed int>::min() : std::numeric_limits<signed int>::max();

        typename State::Piece *i = state.template pieces_begin<team_id>();
        typename State::Piece *end = state.template pieces_end<team_id>();

        // Iterate pieces
        while (i != end) {
            typename State::Piece &piece = *i;

            // Iterate directions
            for (unsigned int dir = 0; dir < 6; dir++) {
                signed int dir_offset = State::dir_offsets[dir];
                typename State::Cell &forward_cell = state.get_cell(piece.cell_id + dir_offset);

                if (forward_cell.value == State::Cell::empty_flag && (TurnState::can_move || (TurnState::can_shoot /* TODO: is glider */))) {
                    typename State::Cell &cur_cell = state.get_cell(piece.cell_id);
                    unsigned int piece_id = cur_cell.value;
                    cur_cell.value = State::Cell::empty_flag;
                    piece.cell_id += dir_offset;

                    if (TurnState::can_move) {
                        forward_cell.value = piece_id;

                        signed int child_score = score_setup<team_id, typename TurnState::AfterMove>(state, alpha, beta, depth);
                        if (exclusive_cmp(child_score, score)) {
                            score = child_score;
                            if (exclusive_cmp(score, alpha)) {
                                alpha = score;
                                if (inclusive_cmp(alpha, beta)) { return score; }
                            }
                        }

                        forward_cell.value = State::Cell::empty_flag;
                    }

                    if (TurnState::can_shoot
                            && state.get_cell(piece.cell_id + State::dir_offsets[dir + 2]).template is_team<team_id>()
                            && !state.get_cell(piece.cell_id + State::dir_offsets[dir + 3]).template is_piece()
                            && state.get_cell(piece.cell_id + State::dir_offsets[dir + 4]).template is_team<team_id>()) {

                        while (true) {
                            typename State::Cell &land_cell = state.get_cell(piece.cell_id);

                            if (!land_cell.is_empty()) {
                                if (land_cell.template is_team<!team_id>()) {
                                    // Enemy piece, capture
                                    typename State::Piece &enemy_piece = state.get_piece(land_cell.value);
                                    state.template remove_piece<!team_id>(enemy_piece);

                                    unsigned int prev_value = land_cell.value;
                                    land_cell.value = piece_id;

                                    signed int child_score = score_setup<team_id, typename TurnState::AfterShoot>(state, alpha, beta, depth);
                                    if (exclusive_cmp(child_score, score)) {
                                        score = child_score;
                                        if (exclusive_cmp(score, alpha)) {
                                            alpha = score;
                                            if (inclusive_cmp(alpha, beta)) { return score; }
                                        }
                                    }

                                    land_cell.value = prev_value;

                                    state.template replace_piece<!team_id>(enemy_piece, enemy_piece.cell_id);
                                }

                                break;
                            }

                            land_cell.value = piece_id;

                            signed int child_score = score_setup<team_id, typename TurnState::AfterShoot>(state, alpha, beta, depth);
                            if (exclusive_cmp(child_score, score)) {
                                score = child_score;
                                if (exclusive_cmp(score, alpha)) {
                                    alpha = score;
                                    if (inclusive_cmp(alpha, beta)) { return score; }
                                }
                            }

                            land_cell.value = State::Cell::empty_flag;

                            piece.cell_id += dir_offset;
                        }
                    }

                    cur_cell.value = piece_id;

                } else if (forward_cell.template is_king<!team_id>()) {
                    // Jump king
                    assert(forward_cell.is_piece());
                    return std::numeric_limits<signed int>::max() - 1;
                }
            }

            i++;
        }
    }
};

/*
function alphabeta(node, depth, α, β, maximizingPlayer) {
     if depth = 0 or node is a terminal node
         return the heuristic value of node
     if maximizingPlayer
         v := -∞
         for each child of node
             v := max(v, alphabeta(child, depth - 1, α, β, FALSE))
             α := max(α, v)
             if a >= b
                 break (* β cut-off *)
         return v
     else
        swap(a, b)
         v := ∞
         for each child of node
             v := min(v, alphabeta(child, depth - 1, b, a, TRUE))
             a := min(a, v)
             if a <= b
                 break (* α cut-off *)
         return v
}
*/


int main() {
    BoardState<4, 8> state;
    state.flood_fill_empty(state.calc_cell_id(5, 4), 4);

    state.init_piece<false>(9, 2);
    state.init_piece<false>(8, 2);
    state.init_piece<false>(8, 1);

    state.init_piece<true>(1, 6);
    state.init_piece<true>(3, 5);
    state.init_piece<true>(4, 5);

    signed int score = MiniMax<4, 8>::score_setup<false, TurnState_Initial>(state, std::numeric_limits<signed int>::min(), std::numeric_limits<signed int>::max(), 1);
    std::cout << score << std::endl;

	return 0;
}

/*
  o O o
 - o o -
- - - - -
 - x x -
  x X x
*/
