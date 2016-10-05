#ifndef TURNSTATE_H
#define TURNSTATE_H

template <unsigned int moves, unsigned int glides, unsigned int spawns, bool ends>
class TurnState {
private:
    static constexpr unsigned int use_1(unsigned int prev) {
        return prev ? prev - 1 : 0;
    }

public:
    static constexpr bool can_move = moves;
    static constexpr bool can_jump = moves;
    static constexpr bool can_glide = glides;
    static constexpr bool can_spawn = spawns;
    static constexpr bool can_end = ends;

    static constexpr bool must_end = !can_move && !can_glide && !can_spawn;

    typedef TurnState<use_1(moves), 0, 0, true> AfterMove;
    typedef TurnState<use_1(moves), 0, 0, true> AfterJump;
    typedef TurnState<0, 1, 0, true> AfterGlide;
    typedef TurnState<0, 0, use_1(spawns), true> AfterSpawn;
};

typedef TurnState<1, 1, 1, false> TurnState_Initial;

#endif // TURNSTATE_H
