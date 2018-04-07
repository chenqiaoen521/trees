export function create ($) {
	$.extend($.fn, {
    tree (options) {
      console.log('== = tree=== ')
      if ( !this.length ) {
        if ( options && options.debug && window.console ) {
          console.warn( "Nothing selected, can't validate, returning nothing." )
        }
        return
      }
      let wzjxtree = $.data( this[ 0 ], "wzjxtree" )
      if ( wzjxtree ) {
        return wzjxtree;
      } 
      wzjxtree = new wzjxtree( options, this[ 0 ] )
      $.data( this[ 0 ], "wzjxtree", wzjxtree )
    }
  })
  $.extend(wzjxtree, {
    defaults: {

    },
    prototype: {
       init () {
        console.log('=== init ===')
       },
       constructor: wzjxtree
    }
  })
}

export function wzjxtree (options, el) {
  this.settings = $.extend( true, {}, wzjxtree.defaults, options )
  this.init()
}



