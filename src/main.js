import $ from 'jquery'
let instance_counter = 0

export function create () {
  merge()
  $.extend($.fn, {
    tree (options) {
      if ( !this.length ) {
        console.warn( "Nothing selected, can't create Trees, returning nothing." )
        return
      }
      let wzjxtree = $.data( this[ 0 ], "wzjxtree" )
      if ( wzjxtree ) {
        return wzjxtree;
      } 
      wzjxtree = new $.wzjxtree( options, this[ 0 ] )
      $.data( this[ 0 ], "wzjxtree", wzjxtree )

      return wzjxtree
    }
  })
  
}
function merge () {
  $.extend($.wzjxtree, {
    version: '1.0.0',
    defaults: {
      data: false,
      strings: false,
      check_callback: false,
      error: $.noop,
      animation: 200,
      multiple: true,
      themes: {
        name: false,
        url: false,
        dir: false,
        dots: true,
        icons: true,
        ellipsis: false,
        stripes: false,
        variant: false,
        responsive: false
      }
    }
  })
}

$.wzjxtree = function (options, el) {
  instance_counter ++
  this._id = instance_counter
  this._cnt = 0
  this._wrk = null
  this._data = {
    core : {
      themes : {
        name : false,
        dots : false,
        icons : false,
        ellipsis : false
      },
      selected : [],
      last_error : {},
      working : false,
      worker_queue : [],
      focused : null
    }
  }
  this.init(options, el)
}

var fn = {}

fn.init = function (options, el) {
  this.settings = $.extend( true, {}, $.wzjxtree.defaults, options )
  this.element = $(el).addClass('wzjxtree wzjxtree-' + this._id)
  this._data.core.ready = false
  this._data.core.loaded = false
  this.element.attr('role','tree')
  if (!this.element.attr('tabindex')) {
    this.element.attr('tabindex', 0)
  }
  this.bind()
  this.trigger("init")
  this._data.core.original_container_html = this.element.find(" > ul > li").clone(true);
  this._data.core.original_container_html
    .find("li").addBack()
    .contents().filter(function() {
      return this.nodeType === 3 && (!this.nodeValue || /^\s+$/.test(this.nodeValue));
    })
    .remove();
  this.element.html("<"+"ul class='jstree-container-ul jstree-children' role='group'><"+"li id='j"+this._id+"_loading' class='jstree-initial-node jstree-loading jstree-leaf jstree-last' role='tree-item'><i class='jstree-icon jstree-ocl'></i><"+"a class='jstree-anchor' href='#'><i class='jstree-icon jstree-themeicon-hidden'></i>" + this.get_string("Loading ...") + "</a></li></ul>");
  this.element.attr('aria-activedescendant','j' + this._id + '_loading');
  this._data.core.li_height = this.get_container_ul().children("li").first().outerHeight() || 24;
  this._data.core.node = this._create_prototype_node();
  /**
   * triggered after the loading text is shown and before loading starts
   * @event
   * @name loading.jstree
   */
  this.trigger("loading")
  this.load_node($.jstree.root)
}
fn.bind = function () {
  var word = '',
    tout = null,
    was_click = 0;
    this.element
      .on("dblclick.jstree", function (e) {
          if(e.target.tagName && e.target.tagName.toLowerCase() === "input") { return true; }
          if(document.selection && document.selection.empty) {
            document.selection.empty();
          }
          else {
            if(window.getSelection) {
              var sel = window.getSelection();
              try {
                sel.removeAllRanges();
                sel.collapse();
              } catch (ignore) { }
            }
          }
        })
      .on("mousedown.jstree", $.proxy(function (e) {
          if(e.target === this.element[0]) {
            e.preventDefault(); // prevent losing focus when clicking scroll arrows (FF, Chrome)
            was_click = +(new Date()); // ie does not allow to prevent losing focus
          }
        }, this))
      .on("mousedown.jstree", ".jstree-ocl", function (e) {
          e.preventDefault(); // prevent any node inside from losing focus when clicking the open/close icon
        })
      .on("click.jstree", ".jstree-ocl", $.proxy(function (e) {
          this.toggle_node(e.target);
        }, this))
      .on("dblclick.jstree", ".jstree-anchor", $.proxy(function (e) {
          if(e.target.tagName && e.target.tagName.toLowerCase() === "input") { return true; }
          if(this.settings.core.dblclick_toggle) {
            this.toggle_node(e.target);
          }
        }, this))
      .on("click.jstree", ".jstree-anchor", $.proxy(function (e) {
          e.preventDefault();
          if(e.currentTarget !== document.activeElement) { $(e.currentTarget).focus(); }
          this.activate_node(e.currentTarget, e);
        }, this))
      .on('keydown.jstree', '.jstree-anchor', $.proxy(function (e) {
          if(e.target.tagName && e.target.tagName.toLowerCase() === "input") { return true; }
          if(this._data.core.rtl) {
            if(e.which === 37) { e.which = 39; }
            else if(e.which === 39) { e.which = 37; }
          }
          var f = this._kbevent_to_func(e);
          if (f) {
            var r = f.call(this, e);
            if (r === false || r === true) {
              return r;
            }
          }
        }, this))
      .on("load_node.jstree", $.proxy(function (e, data) {
          if(data.status) {
            if(data.node.id === $.jstree.root && !this._data.core.loaded) {
              this._data.core.loaded = true;
              if(this._firstChild(this.get_container_ul()[0])) {
                this.element.attr('aria-activedescendant',this._firstChild(this.get_container_ul()[0]).id);
              }
              /**
               * triggered after the root node is loaded for the first time
               * @event
               * @name loaded.jstree
               */
              this.trigger("loaded");
            }
            if(!this._data.core.ready) {
              setTimeout($.proxy(function() {
                if(this.element && !this.get_container_ul().find('.jstree-loading').length) {
                  this._data.core.ready = true;
                  if(this._data.core.selected.length) {
                    if(this.settings.core.expand_selected_onload) {
                      var tmp = [], i, j;
                      for(i = 0, j = this._data.core.selected.length; i < j; i++) {
                        tmp = tmp.concat(this._model.data[this._data.core.selected[i]].parents);
                      }
                      tmp = $.vakata.array_unique(tmp);
                      for(i = 0, j = tmp.length; i < j; i++) {
                        this.open_node(tmp[i], false, 0);
                      }
                    }
                    this.trigger('changed', { 'action' : 'ready', 'selected' : this._data.core.selected });
                  }
                  /**
                   * triggered after all nodes are finished loading
                   * @event
                   * @name ready.jstree
                   */
                  this.trigger("ready");
                }
              }, this), 0);
            }
          }
        }, this))
      // quick searching when the tree is focused
      .on('keypress.jstree', $.proxy(function (e) {
          if(e.target.tagName && e.target.tagName.toLowerCase() === "input") { return true; }
          if(tout) { clearTimeout(tout); }
          tout = setTimeout(function () {
            word = '';
          }, 500);

          var chr = String.fromCharCode(e.which).toLowerCase(),
            col = this.element.find('.jstree-anchor').filter(':visible'),
            ind = col.index(document.activeElement) || 0,
            end = false;
          word += chr;

          // match for whole word from current node down (including the current node)
          if(word.length > 1) {
            col.slice(ind).each($.proxy(function (i, v) {
              if($(v).text().toLowerCase().indexOf(word) === 0) {
                $(v).focus();
                end = true;
                return false;
              }
            }, this));
            if(end) { return; }

            // match for whole word from the beginning of the tree
            col.slice(0, ind).each($.proxy(function (i, v) {
              if($(v).text().toLowerCase().indexOf(word) === 0) {
                $(v).focus();
                end = true;
                return false;
              }
            }, this));
            if(end) { return; }
          }
          // list nodes that start with that letter (only if word consists of a single char)
          if(new RegExp('^' + chr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '+$').test(word)) {
            // search for the next node starting with that letter
            col.slice(ind + 1).each($.proxy(function (i, v) {
              if($(v).text().toLowerCase().charAt(0) === chr) {
                $(v).focus();
                end = true;
                return false;
              }
            }, this));
            if(end) { return; }

            // search from the beginning
            col.slice(0, ind + 1).each($.proxy(function (i, v) {
              if($(v).text().toLowerCase().charAt(0) === chr) {
                $(v).focus();
                end = true;
                return false;
              }
            }, this));
            if(end) { return; }
          }
        }, this))
      // THEME RELATED
      .on("init.jstree", $.proxy(function () {
          var s = this.settings.themes;
          this._data.core.themes.dots     = s.dots;
          this._data.core.themes.stripes    = s.stripes;
          this._data.core.themes.icons    = s.icons;
          this._data.core.themes.ellipsis   = s.ellipsis;
          this.set_theme(s.name || "default", s.url);
          this.set_theme_variant(s.variant);
        }, this))
      .on("loading.jstree", $.proxy(function () {
          this[ this._data.core.themes.dots ? "show_dots" : "hide_dots" ]();
          this[ this._data.core.themes.icons ? "show_icons" : "hide_icons" ]();
          this[ this._data.core.themes.stripes ? "show_stripes" : "hide_stripes" ]();
          this[ this._data.core.themes.ellipsis ? "show_ellipsis" : "hide_ellipsis" ]();
        }, this))
      .on('blur.jstree', '.jstree-anchor', $.proxy(function (e) {
          this._data.core.focused = null;
          $(e.currentTarget).filter('.jstree-hovered').mouseleave();
          this.element.attr('tabindex', '0');
        }, this))
      .on('focus.jstree', '.jstree-anchor', $.proxy(function (e) {
          var tmp = this.get_node(e.currentTarget);
          if(tmp && tmp.id) {
            this._data.core.focused = tmp.id;
          }
          this.element.find('.jstree-hovered').not(e.currentTarget).mouseleave();
          $(e.currentTarget).mouseenter();
          this.element.attr('tabindex', '-1');
        }, this))
      .on('focus.jstree', $.proxy(function () {
          if(+(new Date()) - was_click > 500 && !this._data.core.focused && this.settings.core.restore_focus) {
            was_click = 0;
            var act = this.get_node(this.element.attr('aria-activedescendant'), true);
            if(act) {
              act.find('> .jstree-anchor').focus();
            }
          }
        }, this))
      .on('mouseenter.jstree', '.jstree-anchor', $.proxy(function (e) {
          this.hover_node(e.currentTarget);
        }, this))
      .on('mouseleave.jstree', '.jstree-anchor', $.proxy(function (e) {
          this.dehover_node(e.currentTarget);
        }, this));
}
fn.unbind = function () {
  this.element.off('.wzjxtree')
  $(document).off('.wzjxtree-' + this._id)
}
fn.trigger = function (ev, data) {
  if(!data) {
    data = {}
  }
  data.instance = this
  this.element.triggerHandler(ev.replace('.wzjxtree','') + '.wzjxtree', data)
}

$.wzjxtree.prototype = fn
