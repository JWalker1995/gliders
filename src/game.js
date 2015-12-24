var Config = require('./config.js');
var Player = require('./player.js');
var HexGrid = require('./hexgrid.js');
var ClientError = require('./clienterror.js');
var Util = require('./util.js');
var Callback = require('./callback.js');

module.exports = function(game_id)
{
    var _this = this;

    var board_code;
    var formation_code;
    var options_code;

    var players = [];

    var board;
    var pieces = [];
    var opts = JSON.parse(JSON.stringify(Config.default_opts));

    var num_players;
    var players_dead;
    var player_spawns;

    var turn = 0;
    var current_player = 0;
    var can_shoot = true;
    var turn_actions = [];

    var board_rad;
    var board_diam;
    var neighbor_offsets;

    this.CELL_EMPTY = 1;
    this.CELL_EDGE = 2;
    this.CELL_WALL = 3;

    this.ACTION_MOVE = 1;
    this.ACTION_SHOOT = 2;
    this.ACTION_SPAWN = 3;

    this.change_player_callback = new Callback();
    this.add_piece_callback = new Callback();
    this.code_warning_callback = new Callback();
    this.do_action_callback = new Callback();
    this.remove_piece_callback = new Callback();
    this.eliminate_player_callback = new Callback();
    this.end_turn_callback = new Callback();

    this.get_game_id = function() {return game_id;};
    this.get_players = function() {return players;};
    this.get_num_players = function() {return num_players;};

    this.get_board_code = function() {return board_code;};
    this.get_formation_code = function() {return formation_code;};
    this.get_options_code = function() {return options_code;};

    this.get_board = function() {return board;};
    this.get_pieces = function() {return pieces;};
    this.get_options = function() {return options;};

    this.update_board = function(code)
    {
        board_code = code;

        var type_map = {
            'n': _this.CELL_EMPTY,
            'v': _this.CELL_EDGE,
            'w': _this.CELL_WALL,
        };
        var meta_callback = function(radius, sectors)
        {
            board_rad = radius;
            board_diam = radius * 2 + 1;
            board = Util.fill_array(board_diam * board_diam, _this.CELL_EDGE);

            neighbor_offsets = [-board_diam + 1, 1, board_diam, board_diam - 1, -1, -board_diam];
            neighbor_offsets = neighbor_offsets.concat(neighbor_offsets);
        };
        var add_cell = function(x, y, type)
        {
            if (type === 'n') {type = _this.CELL_EMPTY;}
            else if (type === 'w') {type = _this.CELL_WALL;}
            else if (type !== 'v' && type)
            {
                _this.code_warning_callback.call('Invalid type code "' + type + '"');
                return;
            }
            else {type = _this.CELL_EMPTY;}

            var loc = _this.get_loc(x, y);
            board[loc] = type;
        };

        HexGrid.str_to_grid(code, meta_callback, add_cell, _this.code_warning_callback.call);

        pieces = [];
    };

    this.update_formation = function(code)
    {
        formation_code = code;

        for (var i = 0; i < pieces.length; i++)
        {
            board[pieces[i].loc] = _this.CELL_EMPTY;
            _this.remove_piece_callback.call(pieces[i]);
        }
        pieces = [];

        var meta_callback = function(radius, sectors)
        {
            num_players = 6 / sectors;
            players_dead = Util.fill_array(num_players, undefined);
            player_spawns = Util.fill_array(num_players, opts.spawns);
        };
        var add_piece = function(x, y, type, sector)
        {
            if (type === 'n' || type === 'k')
            {
                var loc = _this.get_loc(x, y);

                if (board[loc] === _this.CELL_EDGE)
                {
                    _this.code_warning_callback.call('Make piece location is an edge cell');
                    return;
                }
                if (board[loc] !== _this.CELL_EMPTY)
                {
                    _this.code_warning_callback.call('Make piece location is already occupied');
                    return;
                }

                make_piece(sector, loc, type === 'k');
            }
            else if (type !== 'e' && type)
            {
                _this.code_warning_callback.call('Invalid type code "' + type + '"');
            }
        };
        HexGrid.str_to_grid(code, meta_callback, add_piece, _this.code_warning_callback.call);
    };

    this.update_options = function(code)
    {
        options_code = code;

        opts = JSON.parse(JSON.stringify(Config.default_opts));

        var assignments = code.split(',');
        for (var i = 0; i < assignments.length; i++)
        {
            var parts = assignments[i].split('=');
            opts[parts[0].trim()] = parts[1].trim();
        }

        player_spawns = Util.fill_array(num_players, opts.spawns);
    };

    this.join_player = function(player)
    {
        if (players.indexOf(player) !== -1)
        {
            throw new ClientError('You have already joined this game');
        }

        var index = players.length;
        if (index >= num_players)
        {
            throw new ClientError('This game is already full');
        }

        players.push(player);
        _this.change_player_callback.call(index, player);

        return players.length === num_players;
    };

    this.remove_player = function(player)
    {
        var index = players.indexOf(player);
        if (index === -1)
        {
            throw new ClientError('You are not in this game');
        }

        players.splice(index, 1);
        _this.change_player_callback.call(index, undefined);

        return players.length === 0;
    };

    this.serialize = function()
    {
        return {
            'game_id': game_id,
            'board': board_code,
            'formation': formation_code,
            'options': options_code,
            'player_names': players.map(function(val) {return val.get_name();}),
        };
    };
    this.deserialize = function(obj)
    {
        if (typeof obj.game_id === 'number' && typeof game_id === 'undefined') {game_id = obj.game_id;}
        if (obj.board) {_this.update_board(obj.board);}
        if (obj.formation) {_this.update_formation(obj.formation);}
        if (obj.options) {_this.update_options(obj.options);}
        if (obj.player_names) {players = obj.player_names.map(function(name) {return Player.create(name);});}
    };

    this.get_piece = function(piece_id)
    {
        var piece = pieces[piece_id];
        if (typeof piece === 'undefined')
        {
            throw new ClientError('Piece with id ' + piece_id + ' does not exist.');
        }
        return piece;
    };

    this.get_piece_actions = function(piece)
    {
        if (piece.player_id !== current_player) {return [];}

        var actions = [];

        var loc = piece.loc;
        for (var j = 0; j < 6; j++)
        {
            var dir = neighbor_offsets[j];
            var front_loc = loc + dir;

            // Move single cell
            if (is_move_valid(piece, front_loc))
            {
                actions.push({
                    'type': _this.ACTION_MOVE,
                    'dir': j,
                });
            }

            // Check if this piece can be shot from a glider
            if (is_shoot_valid(piece, front_loc, j))
            {
                var dst_loc = front_loc;
                var dist = 1;

                while (board[dst_loc] === this.CELL_EMPTY)
                {
                    actions.push({
                        'type': _this.ACTION_SHOOT,
                        'dir': j,
                        'dist': dist,
                    });

                    dst_loc += dir;
                    dist++;
                }

                if (typeof board[dst_loc] === 'object' && board[dst_loc].player_id !== current_player)
                {
                    // Hit an enemy piece
                    actions.push({
                        'type': _this.ACTION_SHOOT,
                        'dir': j,
                        'dist': dist,
                    });
                }
            }

            if (is_spawn_valid(piece, front_loc))
            {
                actions.push({
                    'type': _this.ACTION_SPAWN,
                    'dir': j,
                });
            }
        }

        return actions;
    };

    this.turn_is = function(player_id)
    {
        return player_id === current_player;
    };

    this.is_action_valid = function(piece, action)
    {
        if (action.dir < 0 || action.dir >= 6)
        {
            throw new ClientError('Unexpected action.dir: ' + action.dir);
        }

        if (piece.player_id !== current_player) {return false;}

        var front_loc = piece.loc + neighbor_offsets[action.dir];

        if (action.type === _this.ACTION_MOVE)
        {
            return is_move_valid(piece, front_loc);
        }
        else if (action.type === _this.ACTION_SHOOT)
        {
            return is_shoot_valid(piece, front_loc, action.dir);
        }
        else if (action.type === _this.ACTION_SPAWN)
        {
            return is_spawn_valid(piece, front_loc);
        }
        else
        {
            return false;
        }
    };

    this.is_end_turn_valid = function()
    {
        return !!turn_actions.length;
    };

    var is_move_valid = function(piece, front_loc)
    {
        if (turn_actions.length) {return false;}

        if (board[front_loc] === _this.CELL_EMPTY) {return true;}
        if (piece.is_king && typeof board[front_loc] === 'object' && board[front_loc].player_id !== current_player) {return true;}
        if (typeof board[front_loc] === 'object' && board[front_loc].is_king && board[front_loc].player_id !== current_player) {return true;}

        return false;
    };
    var is_shoot_valid = function(piece, front_loc, dir)
    {
        if (!can_shoot) {return false;}

        var back_right = board[piece.loc + neighbor_offsets[dir + 2]];
        if (typeof back_right !== 'object' || back_right.player_id !== current_player) {return false;}

        var back_left = board[piece.loc + neighbor_offsets[dir + 4]];
        if (typeof back_left !== 'object' || back_left.player_id !== current_player) {return false;}

        var back_center = board[piece.loc + neighbor_offsets[dir + 3]];
        if (back_center !== _this.CELL_EMPTY) {return false;}

        return true;
    };
    var is_spawn_valid = function(piece, front_loc)
    {
        return false;

        if (!piece.is_king) {return false;}
        if (turn_actions.length) {return false;}
        if (!player_spawns[current_player]) {return false;}

        if (board[front_loc] === _this.CELL_EMPTY) {return true;}

        return false;
    };

    this.get_action_location = function(piece, action)
    {
        if (action.type === _this.ACTION_MOVE || action.type === _this.ACTION_SPAWN)
        {
            return piece.loc + neighbor_offsets[action.dir];
        }
        else if (action.type === _this.ACTION_SHOOT)
        {
            var loc = piece.loc;
            var dir_offset = neighbor_offsets[action.dir];
            var i = 0;

            do {
                loc += dir_offset;
                i++;
            } while (i < action.dist && board[loc] === this.CELL_EMPTY);

            if (board[loc] !== _this.CELL_EMPTY && (typeof board[loc] !== 'object' || board[loc].player_id === current_player))
            {
                // Hit the edge or our own piece
                loc -= dir_offset;
            }

            return loc;
        }
    };

    this.do_action = function(piece, action)
    {
        if (typeof piece !== 'object')
        {
            throw new ClientError('Invalid piece');
        }

        if (!_this.is_action_valid(piece, action)) {return false;}

        if (action.type !== _this.ACTION_SHOOT) {can_shoot = false;}

        var dst_loc = _this.get_action_location(piece, action);
        if (typeof dst_loc === 'undefined') {return false;}

        if (board[dst_loc] === _this.CELL_EDGE)
        {
            throw new ClientError('Action destination is an edge cell');
        }

        action.loc = piece.loc;

        if (board[dst_loc] !== _this.CELL_EMPTY)
        {
            remove_piece(board[dst_loc]);
        }

        if (action.type === _this.ACTION_SPAWN)
        {
            player_spawns[piece.player_id]--;
            make_piece(piece.player_id, dst_loc, false);
        }
        else
        {
            board[piece.loc] = _this.CELL_EMPTY;
            piece.loc = dst_loc;
            board[piece.loc] = piece;
        }

        turn_actions.push(action);
        _this.do_action_callback.call(piece, action);

        return true;
    };

    var make_piece = function(player_id, loc, is_king)
    {
        if (board[loc] === _this.CELL_EDGE)
        {
            throw new ClientError('Make piece location is an edge cell');
        }
        if (board[loc] !== _this.CELL_EMPTY)
        {
            throw new ClientError('Make piece location is already occupied');
        }

        var piece = {
            'player_id': player_id,
            'is_king': is_king,
            'loc': loc,
            'id': pieces.length,
            'upper_player': undefined,
            'upper_is_king': false,
        };

        board[piece.loc] = piece;
        pieces.push(piece);

        return piece;
    };
    var remove_piece = function(piece)
    {
        // Update the pieces array by replacing this piece with the last piece
        var last_piece = pieces.pop();
        last_piece.id = piece.id;
        pieces[last_piece.id] = last_piece;

        board[piece.loc] = _this.CELL_EMPTY;

        _this.remove_piece_callback.call(piece);

        if (piece.is_king)
        {
            if (is_player_eliminated(piece.player_id))
            {
                _this.eliminate_player_callback.call();
            }
        }
    };
    var is_player_eliminated = function(player_id)
    {
        for (var i = 0; i < pieces.length; i++)
        {
            if (pieces[i].player_id === player_id && pieces[i].is_king) {return false;}
        }
        return true;
    };

    this.end_turn = function()
    {
        if (!_this.is_end_turn_valid()) {return false;}

        var prev_player = current_player;

        do
        {
            turn++;
            current_player = turn % num_players;
        } while (players_dead[current_player]);

        can_shoot = true;

        var prev_actions = turn_actions;
        turn_actions = [];

        _this.end_turn_callback.call(prev_player, prev_actions);
    };

    this.get_row = function(loc)
    {
        return Math.floor(loc / board_diam) - board_rad;
    };
    this.get_col = function(loc)
    {
        return (loc % board_diam) - board_rad;
    };
    this.get_loc = function(row, col)
    {
        return (row + board_rad) * board_diam + col + board_rad;
    };

    this.get_board = function() {return board;};
    this.get_pieces = function() {return pieces;};
};
