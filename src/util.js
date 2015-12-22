var Util = module.exports = {
    'fill_array': function(size, val)
    {
        var res = [];
        for (var i = 0; i < size; i++)
        {
            res[i] = val;
        }
        return res;
    },
    'escape_text': function(text)
    {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },
    'get_classes': function(el)
    {
        return (el.getAttribute('class') || '').split(' ');
    },
    'has_class': function(el, c)
    {
        return Util.get_classes(el).indexOf(c) !== -1;
    },
    'add_class': function(el, c)
    {
        var old_classes = Util.get_classes(el);
        var index = old_classes.indexOf(c);
        if (index === -1)
        {
            old_classes.push(c);
            el.setAttribute('class', old_classes.join(' ').trim());
        }
    },
    'remove_class': function(el, c)
    {
        var old_classes = Util.get_classes(el);
        var index = old_classes.indexOf(c);
        if (index !== -1)
        {
            old_classes.splice(index, 1);
            el.setAttribute('class', old_classes.join(' ').trim());
        }
    },
    'toggle_class': function(el, c)
    {
        var old_classes = Util.get_classes(el);
        var index = old_classes.indexOf(c);
        if (index === -1)
        {
            old_classes.push(c);
        }
        else
        {
            old_classes.splice(index, 1);
        }
        el.setAttribute('class', old_classes.join(' ').trim());
    },
};
