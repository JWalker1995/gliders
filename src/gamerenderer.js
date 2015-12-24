var Config = require('./config.js');
var HexGridView = require('./hexgridview.js');
var Util = require('./util.js');

module.exports = function(els)
{
    var _this = this;

    var playing_game;
    var grid = new HexGridView(els.board);
    var cell_els;
    var piece_els;

    var shown_actions = [];
    var clicked_piece;
    var player_id;

    var init = function()
    {
    };

    var setup_piece_actions = function(el, piece)
    {
        el.onclick = function()
        {
            if (clicked_piece === piece)
            {
                clicked_piece = undefined;
            }
            else
            {
                clicked_piece = piece;
            }
        };
        el.onmouseover = function()
        {
            if (!clicked_piece)
            {
                hide_piece_actions();
                show_piece_actions(piece);
            }
        };
        el.onmouseout = function()
        {
            if (!clicked_piece)
            {
                hide_piece_actions();
            }
        };

        piece.el = el;
    };

    var show_piece_actions = function(piece)
    {
        if (piece.player_id !== player_id) {return;}

        var actions = playing_game.get_piece_actions(piece);

        for (var i = 0; i < actions.length; i++)
        {
            var el = cell_els[playing_game.get_action_location(piece, actions[i])];
            el.style.fill = Config.cell_action_fill;
            el.onclick = playing_game.do_action.bind(null, piece, actions[i]);

            shown_actions.push(el);
        }
    };

    var hide_piece_actions = function()
    {
        for (var i = 0; i < shown_actions.length; i++)
        {
            var el = shown_actions[i];
            el.style.fill = Config.cell_fill;
            el.onclick = undefined;
        }
        shown_actions = [];
    };

    var update_end_turn_button = function()
    {
        var method = playing_game.is_end_turn_valid() ? 'removeAttribute' : 'setAttribute';
        els.end_turn[method]('disabled', 'disabled');
    };

    this.show_game = function(game)
    {
        grid.begin_update();

        var board = game.get_board();
        cell_els = new Array(board.length);
        for (var i = 0; i < board.length; i++)
        {
            var cell = board[i];
            if (cell !== game.CELL_EDGE)
            {
                var row = game.get_row(i);
                var col = game.get_col(i);
                var el = grid.add_cell(cell, row, col);
                cell_els[i] = el;
            }
        }

        var pieces = game.get_pieces();
        piece_els = [];
        for (var i = 0; i < pieces.length; i++)
        {
            var piece = pieces[i];
            var row = game.get_row(piece.loc);
            var col = game.get_col(piece.loc);
            var el = grid.add_piece(piece, row, col);
            piece_els[i] = el;
        }

        grid.end_update();
    };

    this.play_game = function(game, new_player_id)
    {
        playing_game = game;
        player_id = new_player_id;

        Util.add_class(els.board, 'playing');

        var pieces = game.get_pieces();
        for (var i = 0; i < piece_els.length; i++)
        {
            setup_piece_actions(piece_els[i], pieces[i]);
        }

        els.end_turn.onclick = game.end_turn;
        update_end_turn_button();

        game.add_piece_callback.add(function(piece)
        {
            var row = game.get_row(piece.loc);
            var col = game.get_col(piece.loc);
            var el = grid.add_piece(piece, row, col);
            setup_piece_actions(el, piece);
        });

        game.do_action_callback.add(function(piece, action)
        {
            update_end_turn_button();
            
            var row = game.get_row(piece.loc);
            var col = game.get_col(piece.loc);
            grid.set_transform(piece.el, row, col);

            clicked_piece = undefined;
            hide_piece_actions();
        });

        game.remove_piece_callback.add(function(piece)
        {
            els.board.removeChild(piece.el);
        });

        game.end_turn_callback.add(function(actions)
        {
            update_end_turn_button();
        });
    };

    init();
};
