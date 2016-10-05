#include <iostream>

#include "turnstate.h"
#include "minimax.h"

/*
Search good moves first - gliders, captures
Iterative deepening
Transposition table
Killer move
Quiescence search
*/

typedef MiniMax<4> Algorithm;

template <unsigned int times>
void dilate(Algorithm::SizedBitBoard &bit_board) {
    for (unsigned int i = 0; i < times; i++) {
        bit_board |= bit_board.shift<Algorithm::dir_offsets[0]>();
        bit_board |= bit_board.shift<Algorithm::dir_offsets[2]>();
        bit_board |= bit_board.shift<Algorithm::dir_offsets[4]>();
    }
}

int main(int argc, char **argv) {
    Algorithm::Board board;

    board.kings = {Algorithm::lookup_cell_id(8, 2), Algorithm::lookup_cell_id(1, 6)};

    board.teammates = Algorithm::SizedBitBoard::from_bits(
                board.kings[0],
                Algorithm::lookup_cell_id(7, 2),
                Algorithm::lookup_cell_id(7, 1));

    board.pieces = board.teammates | Algorithm::SizedBitBoard::from_bits(
                board.kings[1],
                Algorithm::lookup_cell_id(2, 5),
                Algorithm::lookup_cell_id(3, 3));

    board.empties = Algorithm::SizedBitBoard::from_bits(Algorithm::lookup_cell_id(4, 4));
    dilate<4>(board.empties);
    board.empties &= ~board.pieces;

    std::cout << board.to_string<false>() << std::endl;

    Algorithm alg;
    signed int score = alg.calc_score(board);
    std::cout << score << std::endl;

    return 0;
}
