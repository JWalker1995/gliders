#ifndef ACTIONLOG_H
#define ACTIONLOG_H

#include <string>
#include <vector>

enum class ActionType {Move, Jump, Glide, Spawn, EndTurn};

class DummyActionLog {
public:
    void copy_actions_to(DummyActionLog empty) const {}
    void add_action(ActionType type, unsigned int src, unsigned int dst) const {}
};

class ActionLog {
public:
    struct Action {
        Action(ActionType type, unsigned int src, unsigned int dst)
            : type(type)
            , src(src)
            , dst(dst)
        {}

        ActionType type;
        unsigned int src;
        unsigned int dst;
    };

    std::vector<Action> actions;

    void copy_actions_to(DummyActionLog empty) const {}
    void copy_actions_to(ActionLog &log) const {
        log.actions = actions;
    }

    void add_action(ActionType type, unsigned int src, unsigned int dst) {
        actions.emplace_back(type, src, dst);
    }

    std::string to_string() const {
        std::string res;

        std::vector<Action>::const_iterator i = actions.cbegin();
        while (i != actions.cend()) {
            switch (i->type) {
                case ActionType::Move: res += "move"; break;
                case ActionType::Jump: res += "jump"; break;
                case ActionType::Glide: res += "glide"; break;
                case ActionType::Spawn: res += "spawn"; break;
                case ActionType::EndTurn: res += "end_turn"; break;
            }

            res += ' ';
            res += std::to_string(i->src);
            res += " -> ";
            res += std::to_string(i->dst);
            res += '\n';

            i++;
        }

        return res;
    }
};

#endif // ACTIONLOG_H
