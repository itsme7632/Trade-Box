import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  unit: string;
}

export interface ShipmentPosition {
  id: number;
  title: string;
  status: string;
  origin: string;
  destination: string;
  originCoords: { lat: number; lng: number } | null;
  destinationCoords: { lat: number; lng: number } | null;
  currentPosition: { lat: number; lng: number } | null;
  progressPercent: number | null;
}

let sharedSocket: Socket | null = null;
let refCount = 0;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return sharedSocket;
}

export function useCommodityPrices(): CommodityPrice[] {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    refCount++;

    const handler = (data: CommodityPrice[]) => setPrices(data);
    socket.on("commodity:prices", handler);

    return () => {
      socket.off("commodity:prices", handler);
      refCount--;
      if (refCount === 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
      }
    };
  }, []);

  return prices;
}

export function useTrackerPositions(): ShipmentPosition[] {
  const [positions, setPositions] = useState<ShipmentPosition[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;
    refCount++;

    const handler = (data: ShipmentPosition[]) => setPositions(data);
    socket.on("tracker:positions", handler);

    return () => {
      socket.off("tracker:positions", handler);
      refCount--;
      if (refCount === 0) {
        sharedSocket?.disconnect();
        sharedSocket = null;
      }
    };
  }, []);

  return positions;
}
