module.exports = function(name, remote)
{
    var _this = this;

    this.get_name = function() {return name;};
};

var cache = {};
module.exports.create = function(name)
{
    if (typeof cache[name] === 'undefined')
    {
        cache[name] = new module.exports(name);
    }
    return cache[name];
};
