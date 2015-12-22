var Config = require('./config.js');
var HexGridView = require('./hexgridview.js');
var Util = require('./util.js');

module.exports = function(els)
{
    var _this = this;

    var grid = new HexGridView(els.board, game);

    var shown_actions = [];
    var clicked_piece;
    var player_id;

    var init = function()
    {
    };

    /*
    var sqrt_3 = Math.sqrt(3.0);
    var get_cell_cx = function(row, col)
    {
        return col * Config.cell_spacing * sqrt_3 + row * Config.cell_spacing * sqrt_3 / 2.0;
    };
    var get_cell_cy = function(row, col)
    {
        return row * Config.cell_spacing * 3.0/2.0;
    };
    */

    var init_els = function()
    {
        els.end_turn.onclick = game.end_turn;
        update_end_turn_button();
    };

    var init_board = function()
    {
        /*
        var board = game.get_board();
        for (var i = 0; i < board.length; i++)
        {
            if (board[i] !== game.CELL_EDGE)
            {
                make_cell(i);
            }
        }
        */
        /*
        for (var i = 0; i < Config.board_rad; i++)
        {
            var cols = Config.board_rad * 2 - 1 - i;
            for (var j = 1 - Config.board_rad; j < Config.board_rad - i; j++)
            {
                make_cell(i, j);
                if (i)
                {
                    make_cell(-i, j + i);
                }
            }
        }
        */
    };

/*
    var make_cell = function(loc)
    {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        grid.set_transform(el, loc);
        el.setAttribute('points', get_hex_pts().join(' '));
        el.style.fill = 'silver';
        el.style.stroke = 'grey';
        el.style.strokeWidth = Config.stroke_width;
        el.onclick = function()
        {
            console.log(loc);
        };
        els.board.appendChild(el);

        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.appendChild(document.createTextNode(loc));
        grid.set_transform(text, loc);
        els.board.appendChild(text);
    };

    var get_hex_pts = function()
    {
        var pts = [];
        for (var i = 0; i < 6; i++)
        {
            var ang = i * Math.PI / 3.0;
            var x = Math.sin(ang) * Config.cell_rad;
            var y = Math.cos(ang) * Config.cell_rad;
            pts.push(Math.round(x) + ',' + Math.round(y));
        }
        return pts;
    };
*/

    var init_pieces = function()
    {
        var pieces = game.get_pieces();
        for (var i = 0; i < pieces.length; i++)
        {
            make_piece(pieces[i]);
        }
    };

    game.code_warning_callback.add(function(msg)
    {
        console.warn(msg);
    });

    game.add_piece_callback.add(function(piece)
    {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        grid.set_transform(el, piece.loc);
        el.setAttribute('r', Config.piece_rad);
        el.style.fill = piece.is_king ? Config.piece_king_colors[piece.player_id] : Config.piece_colors[piece.player_id];
        el.style.stroke = 'silver';
        el.style.strokeWidth = Config.stroke_width;

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
        els.board.appendChild(el);
    });

    var show_piece_actions = function(piece)
    {
        if (piece.player_id !== player_id) {return;}

        var actions = game.get_piece_actions(piece);

        for (var i = 0; i < actions.length; i++)
        {
            var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            grid.set_transform(el, game.get_action_location(piece, actions[i]));
            el.setAttribute('r', Config.action_rad);
            el.style.fill = Config.piece_actions_colors[piece.player_id];
            el.style.stroke = 'silver';
            el.style.strokeWidth = Config.stroke_width;

            el.onclick = game.do_action.bind(null, piece, actions[i]);

            shown_actions.push(el);
            // Need to prepend the action elements so they render behind the piece element
            els.board.insertBefore(el, piece.el);
        }
    };

    var hide_piece_actions = function()
    {
        for (var i = 0; i < shown_actions.length; i++)
        {
            els.board.removeChild(shown_actions[i]);
        }
        shown_actions = [];
    };

    game.do_action_callback.add(function(piece, action)
    {
        update_end_turn_button();

        grid.set_transform(piece.el, piece.loc);

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

    var update_end_turn_button = function()
    {
        var method = game.is_end_turn_valid() ? 'removeAttribute' : 'setAttribute';
        els.end_turn[method]('disabled', 'disabled');
    };

    this.set_player_id = function(new_player_id)
    {
        player_id = new_player_id;
    };

    init_els();
    init_board();
    init_pieces();
};
