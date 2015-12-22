module.exports = function()
{
    var cbs = [];

    this.add = function(callback)
    {
        cbs.push(callback);
    };

    this.remove = function(callback)
    {
        var i = cbs.indexOf(callback);
        if (i !== -1)
        {
            cbs.splice(i, 1);
        }
    };

    this.call = function()
    {
        for (var i = 0; i < cbs.length; i++)
        {
            cbs[i].apply(this, arguments);
        }
    };
};
