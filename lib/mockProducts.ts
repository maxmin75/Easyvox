export type MockProduct = {
  id: string;
  name: string;
  category: "audio" | "smart-home" | "accessories";
  price: number;
  stock: number;
  deliveryDays: number;
  description: string;
};

export const mockProducts: MockProduct[] = [
  {
    id: "p-001",
    name: "Echo Mini Speaker",
    category: "audio",
    price: 49,
    stock: 18,
    deliveryDays: 2,
    description: "Speaker compatto con audio bilanciato per stanze piccole.",
  },
  {
    id: "p-002",
    name: "Echo Room Pro",
    category: "audio",
    price: 129,
    stock: 12,
    deliveryDays: 3,
    description: "Speaker multi-room con bassi profondi e controllo vocale.",
  },
  {
    id: "p-003",
    name: "SoundBeam Bar",
    category: "audio",
    price: 219,
    stock: 7,
    deliveryDays: 4,
    description: "Soundbar sottile con modalità cinema e bluetooth 5.3.",
  },
  {
    id: "p-004",
    name: "Voice Hub Max",
    category: "smart-home",
    price: 159,
    stock: 10,
    deliveryDays: 2,
    description: "Hub centrale per automazioni domestiche e scene personalizzate.",
  },
  {
    id: "p-005",
    name: "Secure Cam 360",
    category: "smart-home",
    price: 89,
    stock: 15,
    deliveryDays: 2,
    description: "Telecamera interna con rotazione completa e visione notturna.",
  },
  {
    id: "p-006",
    name: "Smart Plug Duo",
    category: "smart-home",
    price: 34,
    stock: 40,
    deliveryDays: 1,
    description: "Presa intelligente doppia con monitoraggio consumi in tempo reale.",
  },
  {
    id: "p-007",
    name: "AirSense Thermostat",
    category: "smart-home",
    price: 199,
    stock: 8,
    deliveryDays: 3,
    description: "Termostato smart con programmazione settimanale e geo-fencing.",
  },
  {
    id: "p-008",
    name: "Litebuds S",
    category: "accessories",
    price: 59,
    stock: 30,
    deliveryDays: 2,
    description: "Auricolari true wireless con cancellazione rumore leggera.",
  },
  {
    id: "p-009",
    name: "PowerDock 6-in-1",
    category: "accessories",
    price: 79,
    stock: 20,
    deliveryDays: 2,
    description: "Dock USB-C con HDMI 4K e ricarica passthrough fino a 100W.",
  },
  {
    id: "p-010",
    name: "Carry Case Flex",
    category: "accessories",
    price: 24,
    stock: 50,
    deliveryDays: 1,
    description: "Custodia rigida universale con divisori interni modulabili.",
  },
  {
    id: "p-011",
    name: "Wave Mic USB",
    category: "audio",
    price: 99,
    stock: 14,
    deliveryDays: 3,
    description: "Microfono cardioide USB per call e streaming con filtro integrato.",
  },
  {
    id: "p-012",
    name: "ChargePad Trio",
    category: "accessories",
    price: 69,
    stock: 16,
    deliveryDays: 2,
    description: "Base di ricarica wireless per telefono, watch e auricolari.",
  },
];
