import jQuery from 'jquery'
import {create, wzjxtree} from './main.js'


// 如果是正式环境的话，不输出日志信息
if (ENV !== 'production') {
  // Enable the logger.
  document.write(
	  '<script src="http://' + (location.host || 'localhost').split(':')[0] +
	  ':35729/livereload.js?snipver=1"></' + 'script>'
	);
} else {
  console.log = null
}

create(jQuery)
