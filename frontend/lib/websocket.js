/**
 * WebSocket Client pro real-time FHIR updates
 */
import { useEffect, useRef } from 'react';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export class FHIRWebSocketClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = {};
  }

  connect() {
    const url = `${WS_BASE_URL}${this.endpoint}`;
    console.log(`Připojuji se k WebSocket: ${url}`);
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      console.log('WebSocket připojen');
      this.reconnectAttempts = 0;
      this.emit('connected');
    };
    
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Chyba při parsování WebSocket zprávy:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket chyba:', error);
      this.emit('error', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket odpojen');
      this.emit('disconnected');
      this.attemptReconnect();
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnect pokus ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Maximální počet reconnect pokusů překročen');
      this.emit('max_reconnect_attempts');
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket není připojen');
    }
  }

  handleMessage(data) {
    const messageType = data.type;
    this.emit(messageType, data);
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

/**
 * Hook pro použití WebSocket v React komponentách
 */
export function useOperationsWebSocket(callbacks = {}) {
  const wsRef = useRef(null);

  useEffect(() => {
    // Vytvořit WebSocket spojení
    const ws = new FHIRWebSocketClient('/ws/operations/');
    wsRef.current = ws;

    // Registrovat callbacks
    if (callbacks.onConnected) {
      ws.on('connected', callbacks.onConnected);
    }
    if (callbacks.onOperationUpdate) {
      ws.on('operation_update', callbacks.onOperationUpdate);
    }
    if (callbacks.onInitialState) {
      ws.on('initial_state', callbacks.onInitialState);
    }
    if (callbacks.onDisconnected) {
      ws.on('disconnected', callbacks.onDisconnected);
    }

    // Připojit
    ws.connect();

    // Cleanup při unmount
    return () => {
      ws.disconnect();
    };
  }, []);

  return {
    send: (data) => wsRef.current?.send(data),
    disconnect: () => wsRef.current?.disconnect()
  };
}

/**
 * Hook pro sledování stavu operačních sálů
 */
export function useRoomStatusWebSocket(callbacks = {}) {
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new FHIRWebSocketClient('/ws/rooms/');
    wsRef.current = ws;

    if (callbacks.onRoomStatus) {
      ws.on('rooms_status', callbacks.onRoomStatus);
    }
    if (callbacks.onRoomUpdate) {
      ws.on('room_status_update', callbacks.onRoomUpdate);
    }

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, []);

  return {
    send: (data) => wsRef.current?.send(data)
  };
}

// Pro non-React použití
export default FHIRWebSocketClient;

