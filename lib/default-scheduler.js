// If the scheduler is not customized via `etch.setScheduler`, an instance of
// this class will be used to schedule updates to the document. The
// `updateDocument` method accepts functions to be run at some point in the
// future, then runs them on the next animation frame.
module.exports = class DefaultScheduler {
  constructor () {
    this.updateRequests = []
    this.readRequests = []
    this.pendingAnimationFrame = null
    this.performUpdates = this.performUpdates.bind(this)
    this.performingUpdates = false
  }

  // Enqueues functions that write to the DOM to be performed on the next
  // animation frame. Functions passed to this method should *never* read from
  // the DOM, because that could cause synchronous reflows.
  /**
   * 作用就是把回掉函数扔进updateRequests，这些函数会在performUpdates中执行。requestAnimationFrame其实就是一
   * 个以帧为单位的定时器，这样可以让更新在一帧内解决，避免重复更新
   * @param {*} fn 
   */
  updateDocument (fn) {
    this.updateRequests.push(fn)
    if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = window.requestAnimationFrame(this.performUpdates)
    }
  }

  /**
   * 一样的东西，只不过是放到另一个数组
   * @param {*} fn 
   */
  readDocument (fn) {
    this.readRequests.push(fn)
    if (!this.pendingAnimationFrame) {
      this.pendingAnimationFrame = window.requestAnimationFrame(this.performUpdates)
    }
  }

  // Returns a promise that will resolve at the end of the next update cycle,
  // after all the functions passed to `updateDocument` and `updateDocumentSync`
  // have been run.
  /**
   * 用于返回一个promise，但是该promise的resolve应该是由thne传入的，然后很巧妙的赋值给resolveNextUpdatePromise,
   * 该函数用于后续的回调
   */
  getNextUpdatePromise () {
    if (!this.nextUpdatePromise) {
      this.nextUpdatePromise = new Promise(resolve => {
        this.resolveNextUpdatePromise = resolve
      })
    }
    return this.nextUpdatePromise
  }

  // Performs all the pending document updates. If running these update
  // functions causes *more* updates to be enqueued, they are run synchronously
  // in this update cycle without waiting for another frame.
  /**
   * 本函数用于实质性的更新，首先执行所有的更新请求，然后去掉pendingAnimationFrame（代表可以开始以后的更新），
   * 然后执行所有的readRequests，最后，获取resolveNextUpdatePromise，返回一个promise
   */
  performUpdates () {
    while (this.updateRequests.length > 0) {
      this.updateRequests.shift()()
    }

    // We don't clear the pending frame until all update requests are processed.
    // This ensures updates requested within other updates are processed in the
    // current frame.
    this.pendingAnimationFrame = null

    // Now that updates are processed, we can perform all pending document reads
    // without the risk of interleaving them with writes and causing layout
    // thrashing.
    while (this.readRequests.length > 0) {
      this.readRequests.shift()()
    }

    if (this.nextUpdatePromise) {
      let resolveNextUpdatePromise = this.resolveNextUpdatePromise
      this.nextUpdatePromise = null
      this.resolveNextUpdatePromise = null
      resolveNextUpdatePromise()
    }
  }
}
