var HexGridView = function(container, game)
{
    var _this = this;

    var opts = game.get_options();

    var hex_pool = [];
    var hex_pool_next = 0;

    var hide_cells = function()
    {
        hex_pool_next = 0;
    };

    game.add_cell_callback = function(loc, type)
    {
        if (type === game.CELL_EDGE) {return;}
        
        if (hex_pool_next >= hex_pool.length)
        {
            hex_pool.push(make_cell());
        }

        _this.set_transform(hex_pool[hex_pool_next], loc);
        set_type(hex_pool[hex_pool_next], type);
        hex_pool_next++;
    };

    var finalize_cells = function()
    {
        for (var i = hex_pool_next; i < hex_pool.length; i++)
        {
            hex_pool[i].style.display = 'none';
        }
    };

    var make_cell = function()
    {
        var el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        el.setAttribute('points', get_hex_pts().join(' '));
        el.style.fill = 'silver';
        el.style.stroke = 'grey';
        el.style.strokeWidth = opts.stroke_width;
        el.onclick = function()
        {
        };
        container.appendChild(el);
        return el;

        /*
        var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.appendChild(document.createTextNode(loc));
        _this.set_position(text, loc);
        container.appendChild(text);
        */
    };

    var get_hex_pts = function()
    {
        var pts = [];
        for (var i = 0; i < 6; i++)
        {
            var ang = i * Math.PI / 3.0;
            var x = Math.sin(ang) * opts.cell_rad;
            var y = Math.cos(ang) * opts.cell_rad;
            pts.push(Math.round(x) + ',' + Math.round(y));
        }
        return pts;
    };

    var set_type = function(el, type)
    {
    };

    var sqrt_3 = Math.sqrt(3.0);
    this.set_transform = function(el, loc)
    {
        var row = game.get_row(loc);
        var col = game.get_col(loc);
        var x = Math.floor(col * opts.cell_spacing * sqrt_3 + row * opts.cell_spacing * sqrt_3 / 2.0);
        var y = Math.floor(row * opts.cell_spacing * 3.0/2.0);
        el.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
    };
};
