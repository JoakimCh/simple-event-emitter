
class ListenerError extends Error {
  constructor(cause) {
    super('An event listener had an error.', {cause})
  }
}

/** A simple EventEmitter similar to the one in Node.js.
* See: https://nodejs.org/api/events.html
*/
export class EventEmitter {
  static captureRejections = true
  static captureExceptions = true
  captureRejections; captureExceptions
  #listenersMap = new Map()

  constructor({
    captureRejections = EventEmitter.captureRejections,
    captureExceptions = EventEmitter.captureExceptions
  } = {}) {
    this.captureRejections = captureRejections
    this.captureExceptions = captureExceptions
  }
  
  emit(event, ...args) {
    this.#emit(event, ...args)
  }

  #emit(event, ...args) {
    const listenerMap = this.#listenersMap.get(event)
    if (listenerMap) {
      for (const [listener, once] of [...listenerMap.entries()]) {
        if (once) this.removeEventListener(event, listener)
        try {
          const result = listener(...args)
          if (result instanceof Promise && this.captureRejections) {
            // https://nodejs.org/api/events.html#capture-rejections-of-promises
            result.catch(error => {
              error = new ListenerError(error)
              if (typeof this[Symbol.for('nodejs.rejection')] == 'function') {
                this[Symbol.for('nodejs.rejection')](error)
              } else if (event != 'error') {
                this.#emit('error', error)
              } else {
                throw error
              }
            })
          }
        } catch (error) {
          error = new ListenerError(error)
          if (this.captureExceptions && event != 'error') {
            this.#emit('error', error)
          } else {
            throw error
          }
        }
      }
      return true
    } else if (event == 'error') {
      throw Error('Emitted an error, but no error listener is assigned.', {
        cause: args.length == 1 ? args[0] : args
      })
    }
    return false
  }

  addEventListener(event, listener, {once, first} = {}) {
    this.#emit('newListener', event, listener, once)
    let listenerMap = this.#listenersMap.get(event)
    if (!listenerMap) {
      listenerMap = new Map()
      this.#listenersMap.set(event, listenerMap)
    }
    if (first && listenerMap.size) {
      listenerMap.delete(listener) // if already there
      const entries = [
        [listener, once], // add first
        ...listenerMap.entries()
      ]
      listenerMap.clear()
      for (const [key, value] of entries) {
        listenerMap.set(key, value)
      }
    } else {
      listenerMap.set(listener, once)
    }
    return this
  }

  removeEventListener(event, listener) {
    const listenerMap = this.#listenersMap.get(event)
    if (listenerMap) {
      listenerMap.delete(listener)
      this.#emit('removeListener', event, listener)
      if (!listenerMap.size) this.#listenersMap.delete(event)
      return true
    }
    return false
  }

  removeAllListeners(event) {
    if (event) {
      const listenerMap = this.#listenersMap.get(event)
      if (listenerMap) {
        for (const listener of listenerMap.keys()) {
          this.#emit('removeListener', event, listener)
        }
        this.#listenersMap.delete(event)
      }
    } else {
      for (const event of this.#listenersMap.keys()) {
        this.removeAllListeners(event)
      }
    }
  }

  on(event, listener, {first} = {}) {
    return this.addEventListener(event, listener, {first})
  }

  once(event, listener, {first} = {}) {
    return this.addEventListener(event, listener, {once: true, first})
  }

  off(event, listener) {
    return this.removeEventListener(event, listener)
  }

  eventNames() {
    return [...this.#listenersMap.keys()]
  }

  listeners(event, asMap = false) {
    if (asMap) return this.#listenersMap.get(event)
    return [...(this.#listenersMap.get(event)?.keys() || [])]
  }

  listenerCount(event) {
    return this.#listenersMap.get(event)?.size || 0
  }
}
