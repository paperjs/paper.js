var Pattern = Base.extend({
  _class: 'Pattern',

  // DOCS: Document #initialize()
  initialize: function Pattern(url, repeat, width, height) {
    this._id = Pattern._id = (Pattern._id || 0) + 1;
    this.setUrl(url);
    if(!repeat)
      repeat = 'repeat'

    this.setRepeat(repeat);
    this.setWidth(width);
    this.setHeight(height);
    url = repeat = width = height = null;
  },

  _serialize: function(options, dictionary) {
    return dictionary.add(this, function() {
      return Base.serialize(url,
          options, true, dictionary);
    });
  },

  /**
   * Called by various setters whenever a gradient value changes
   */
  _changed: function() {
    // Notify parrents
    for (var i = 0, l = this._owners && this._owners.length; i < l; i++)
      this._owners[i]._changed();
  },

  /**
   * Called by Color#setGradient()
   * This is required to pass on _changed() notifications to the _owners.
   */
  _addOwner: function(color) {
    if (!this._owners)
      this._owners = [];
    this._owners.push(color);
  },

  /**
   * Called by Color whenever this gradient stops being used.
   */
  _removeOwner: function(color) {
    var index = this._owners ? this._owners.indexOf(color) : -1;
    if (index != -1) {
      this._owners.splice(index, 1);
      if (this._owners.length === 0)
        delete this._owners;
    }
  },

  /**
   * @return {Gradient} a copy of the gradient
   */
  clone: function() {
    return new this.constructor(url);
  },

  getUrl: function() {
    return this._url;
  },

  setUrl: function(url) {
    this._url = url;
    this._changed();
  },

  getRepeat: function() {
    return this._repeat;
  },
  setRepeat: function(r) {
    this._repeat = r;
    this._changed();
  },

  getWidth: function() {
    return this._width;
  },
  setWidth: function(w) {
    this._width = w;
    this._changed();
  },

  getHeight: function() {
    return this._height;
  },
  setHeight: function(h) {
    this._height = h;
    this._changed();
  },

  equals: function(pattern) {
    return pattern && pattern.constructor == this.constructor
        && this._url == pattern.getUrl() && this._repeat == pattern.getRepeat() 
        && this._width == pattern.getWidth() && this._height == pattern.getHeight();
  }
});
