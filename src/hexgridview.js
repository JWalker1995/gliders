var Config = require('./config.js');
var Util = require('./util.js');

module.exports = function(container)
{
    var _this = this;

    var hex_pool = [];
    var hex_pool_next;

    var piece_pool = [];
    var piece_pool_next;

    this.begin_update = function()
    {
        hex_pool_next = 0;
        piece_pool_next = 0;
    };

    this.add_cell = function(type, row, col)
    {
        if (hex_pool_next >= hex_pool.length)
        {
            hex_pool.push(make_cell());
        }

        var el = hex_pool[hex_pool_next];
        hex_pool_next++;

        _this.set_transform(el, row, col);
        set_cell_type(el, type);

        return el;
    };

    this.add_piece = function(piece, row, col)
    {
        if (piece_pool_next >= piece_pool.length)
        {
            piece_pool.push(make_piece());
        }

        var el = piece_pool[piece_pool_next];
        piece_pool_next++;

        _this.set_transform(el, row, col);
        set_piece_type(el, piece);

        return el;
    };

    this.end_update = function()
    {
        for (var i = hex_pool_next; i < hex_pool.length; i++)
        {
            hex_pool[i].style.display = 'none';
        }

        for (var i = piece_pool_next; i < piece_pool.length; i++)
        {
            piece_pool[i].style.display = 'none';
        }
    };

    var make_cell = function()
    {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        el.setAttribute('points', get_hex_pts().join(' '));
        el.style.fill = Config.cell_fill;
        el.style.stroke = Config.cell_stroke;
        el.style.strokeWidth = Config.stroke_width;
        container.insertBefore(el, container.firstChild);
        return el;

        /*
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.appendChild(document.createTextNode(loc));
        _this.set_position(text, loc);
        container.appendChild(text);
        */
    };

    var make_piece = function()
    {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        el.setAttribute('r', Config.piece_rad);
        el.style.stroke = Config.piece_stroke;
        el.style.strokeWidth = Config.stroke_width;
        container.appendChild(el);
        return el;
    };

    var set_cell_type = function(el, type)
    {
    };

    var set_piece_type = function(el, piece)
    {
        el.style.fill = piece.is_king ? Config.piece_king_colors[piece.player_id] : Config.piece_colors[piece.player_id];
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

    var sqrt_3 = Math.sqrt(3.0);
    this.set_transform = function(el, row, col)
    {
        var x = Math.floor(col * Config.cell_spacing * sqrt_3 + row * Config.cell_spacing * sqrt_3 / 2.0);
        var y = Math.floor(row * Config.cell_spacing * 3.0/2.0);
        el.style.display = 'initial';
        el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    };
};
