'use strict'

var events = require("events");

/**

  Promise to Async life

  --> START_BEFORE ------------------- COMPLETE -
    |                                          |
    |                                          |---- ERROR
    |                                          |
    |0-------------- PROGRESS --------------100|

*/

// 发送之前
var START_BEFORE = "startBefore";
//进度
var PROGRESS = "progress";
//完成
var COMPLETE = "complete";
//错误
var ERROR = "error";



/**
 *  new PromiseAsync( request )
 *  @param {Promise} promise
 */

function PromiseAsync( promise ){

  //inherit events.EventEmitter
  events.EventEmitter.call(this);

  if(arguments.length > 1){
    this.promiseIterator = Array.prototype.slice.call(arguments);
  }else{
    this.promise = promise;
  }

  this.START_BEFORE = START_BEFORE;
  this.PROGRESS = PROGRESS;
  this.COMPLETE = COMPLETE;
  this.ERROR = ERROR;


}


//inherit events.EventEmitter
PromiseAsync.prototype = events.EventEmitter.prototype;
//fixed constructor to PromiseAsync
PromiseAsync.prototype.constructor = PromiseAsync;

/**
 * @param {Object|function}observer
 *  1. subscribe({
 *        onSendBefore:()=>{}
 *        onComplete:()=>{}
 *        onProgress:()=>{}
 *        onError:()=>{}
 *      })
 *
 *  2. subscribe(()=>{ console.log("SUCCESS") })
 */

PromiseAsync.prototype.subscribe = function(observer) {

  if(typeof observer == "function"){
    this.__on(this.COMPLETE, observer);
    return this;
  }

  if(typeof observer == "object"){
    observer.onSendBefore && this.__on(this.START_BEFORE ,observer.onSendBefore,observer);
    observer.onProgress && this.__on(this.PROGRESS, observer.onProgress,observer);
    observer.onComplete && this.__on(this.COMPLETE, observer.onComplete,observer);
    observer.onError && this.__on(this.ERROR, observer.onError,observer);
    return this;
  }

  throw new Error("observer must be 'function' or 'Object'");

}

/**
  * parallel promise
  * .mrege( Promise.resolve("hello") )
  * @param {Promise} promise
  */
PromiseAsync.prototype.merge = function(promise){

  if(!this.promiseIterator){
    this.promiseIterator = [this.promise]
  }

  this.promiseIterator.push(promise);

  return this;
}

/**
  * @param {fn} fn(datas)
  *
*/
PromiseAsync.prototype.flat = function(fn){
  let promiseIterator = this.promiseIterator;
  this.promiseIterator = [new Promise(function(resolve, reject){
    co(promiseIterator)
    .then((datas)=>{
      resolve(fn(datas))
    })
    .catch((error)=>{
      reject(error)
    })
  })];
  return this;
}

/**
 * 启动
 */
PromiseAsync.prototype.start = function(){
  if(this.promiseIterator){
    //多个promise
    this.emit(this.START_BEFORE);
    var iterator = this.promiseIterator;
    //TODO 需要同步执行
    co(this.promiseIterator)
    .then((datas)=>{
      this.emit(this.COMPLETE, datas);
    }).catch((error)=>{
      this.emit(this.ERROR, error);
    })

  }else{
    //仅有一个promise
    this.emit(this.START_BEFORE);
    this.promise.then((data)=>{
      this.emit(this.COMPLETE, data);
    })
    .catch((error)=>{
      this.emit(this.ERROR, error);
    })
  }
}

/**
 * __on
 * events.emitter `on`
 */
PromiseAsync.prototype.__on = function(type, fn, self){
  this.on(type, function(a,b,c){
    fn.apply(self, arguments)
  })
}



function co(iterator){
  return new Promise(function(resolve, reject){
    var datas = [];
    var index = 0;
    next(iterator[index]);
    function next(promise){
      promise.then(function(data){
        if(data instanceof Promise){
          next(data);
        }else{
          datas.push(data);
          if(iterator[++index]){
            next(iterator[index]);
          }else{
            resolve(datas);
          }
        }
      });
    }
  })
}



module.exports = PromiseAsync;