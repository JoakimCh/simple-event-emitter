
/** A bare-bones (minimal) version of Node.js EventEmitter. */
export class EventEmitter {
  #listenersMap = new Map()
  
  emit(event, ...args) {
    const listenerMap = this.#listenersMap.get(event)
    if (listenerMap) {
      // setTimeout(() => {
        for (const [listener, once] of listenerMap.entries()) {
          if (once) this.removeEventListener(event, listener)
          try {
            listener(...args)
          } catch (error) {
            if (!this.emit('error', error)) {
              throw error
            }
          }
        }
      // }, 0)
      return true
    }
    return false
  }
  
  addEventListener(event, listener, {once} = {}) {
    this.emit('newListener', event, listener)
    const listenerMap = this.#listenersMap.get(event)
    if (listenerMap) {
      listenerMap.set(listener, once)
    } else {
      const listenerMap = new Map()
      listenerMap.set(listener, once)
      this.#listenersMap.set(event, listenerMap)
    }
  }

  removeEventListener(event, listener) {
    const listenerMap = this.#listenersMap.get(event)
    if (listenerMap) {
      listenerMap.delete(listener)
      this.emit('removeListener', event, listener)
      if (!listenerMap.size) this.#listenersMap.delete(event)
      return true
    }
    return false
  }

  removeAllListeners(event) {
    if (event) this.#listenersMap.delete(event)
    else       this.#listenersMap.clear()
  }

  on(event, listener) {
    this.addEventListener(event, listener)
  }

  once(event, listener) {
    this.addEventListener(event, listener, {once: true})
  }

  off(event, listener) {
    this.removeEventListener(event, listener)
  }
}

globalThis.EventEmitter = EventEmitter
