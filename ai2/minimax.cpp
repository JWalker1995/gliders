#include "minimax.h"

template <unsigned int board_rad, bool save_actions>
constexpr signed int MiniMax<board_rad, save_actions>::dir_offsets[];

template <unsigned int board_rad, bool save_actions>
std::unordered_map<
	typename MiniMax<board_rad, save_actions>::Board,
	typename MiniMax<board_rad, save_actions>::CacheScore,
	typename MiniMax<board_rad, save_actions>::Board::Hasher
> MiniMax<board_rad, save_actions>::cache;

template class MiniMax<4, true>;