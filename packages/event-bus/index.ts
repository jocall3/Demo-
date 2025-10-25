/**
 * @file packages/event-bus/index.ts
 * @description Implements a custom client-side event bus for Micro-Frontend communication.
 * This global event bus allows decoupled components (potentially from different micro-frontends)
 * to publish and subscribe to events, facilitating cross-application state synchronization
 * and interaction without direct dependencies.
 *
 * This adheres to the "Decompose the Monolithic Frontend into a Micro-Frontend Architecture"
 * directive, specifically addressing "Communication between micro-frontends will be handled
 * via a custom client-side event bus."
 */

/**
 * Interface for a generic event listener.
 * @template T The type of the event payload.
 */
interface EventListener<T> {
  (payload: T): void;
}

/**
 * Defines the mapping from event names to their payload types.
 * Extend this interface to define custom application-specific events.
 *
 * @example
 * interface AppEvents extends CustomEventMap {
 *   'userLoggedIn': { userId: string; token: string; };
 *   'accountUpdated': { accountId: string; newBalance: number; };
 * }
 */
interface CustomEventMap {
  'auth/loggedIn': { userId: string; token: string; };
  'auth/loggedOut': { userId: string | null; };
  'navigation/changeView': { viewName: string; payload?: Record<string, any>; };
  'data/refetchRequest': { queryKey: string[]; reason?: string; };
  'ui/themeChanged': { theme: 'light' | 'dark'; };
}

/**
 * A type-safe Event Bus implementation for client-side (Micro-Frontend) communication.
 * It provides methods to subscribe to, unsubscribe from, and publish events.
 *
 * @template M An interface extending `CustomEventMap` to provide type safety for custom events.
 */
class EventBus<M extends CustomEventMap = CustomEventMap> {
  private listeners = new Map<keyof M, Set<EventListener<any>>>();

  /**
   * Subscribes a listener function to a specific event.
   *
   * @template K The name of the event.
   * @param {K} eventName The name of the event to subscribe to.
   * @param {EventListener<M[K]>} listener The callback function to be executed when the event is emitted.
   * @returns {() => void} A function to unsubscribe the listener.
   */
  on<K extends keyof M>(eventName: K, listener: EventListener<M[K]>): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(listener as EventListener<any>);
    // Return an unsubscribe function.
    return () => this.off(eventName, listener);
  }

  /**
   * Unsubscribes a listener function from a specific event.
   *
   * @template K The name of the event.
   * @param {K} eventName The name of the event to unsubscribe from.
   * @param {EventListener<M[K]>} listener The specific listener function to remove.
   */
  off<K extends keyof M>(eventName: K, listener: EventListener<M[K]>): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.delete(listener as EventListener<any>);
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }
    }
  }

  /**
   * Publishes an event, executing all registered listeners for that event.
   *
   * @template K The name of the event.
   * @param {K} eventName The name of the event to publish.
   * @param {M[K]} payload The data payload to pass to the listeners.
   */
  emit<K extends keyof M>(eventName: K, payload: M[K]): void {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`Error in event listener for '${String(eventName)}':`, error);
        }
      });
    }
  }
}

// Export a singleton instance of the EventBus for consistent usage across the application.
export const clientSideEventBus = new EventBus();

// Optionally, export the types if external modules need to extend CustomEventMap or use EventBus directly.
export type { EventListener, CustomEventMap, EventBus };