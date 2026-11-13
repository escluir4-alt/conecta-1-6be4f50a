import { describe, expect, it } from "vitest";
import { calculateRoadTripRoute, calculateDistanceKm, formatRouteDuration } from "../services/tollEngine";

const origin = { id: "sp", label: "A", name: "São Paulo, SP", lat: -23.5505, lng: -46.6333 };
const destination = { id: "rj", label: "B", name: "Rio de Janeiro, RJ", lat: -22.9068, lng: -43.1729 };

describe("Roteirizador original: cálculos rodoviários", () => {
  it("calcula distância geográfica entre São Paulo e Rio de Janeiro", () => {
    const distance = calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(390);
  });
  it("formata o tempo de viagem", () => {
    expect(formatRouteDuration(75)).toBe("1 h 15 min");
  });
  it("calcula rota, combustível e pedágios de modo consistente", () => {
    const trip = calculateRoadTripRoute({ origin, destination, vehicleCategoryId: "car", fuelTypeId: "gasolina" });
    expect(trip.distanceKm).toBeGreaterThan(400);
    expect(trip.tollPlazasCount).toBeGreaterThan(0);
    expect(trip.fuelLitersNeeded).toBeGreaterThan(0);
    expect(trip.fuelTotalBRL).toBeGreaterThan(0);
    expect(trip.totalTripCostBRL).toBeCloseTo(trip.tollTotalBRL + trip.fuelTotalBRL, 2);
    expect(trip.rotograma.length).toBeGreaterThan(1);
  });
  it("cobra tarifa de pedágio superior para caminhão de três eixos", () => {
    const car = calculateRoadTripRoute({ origin, destination, vehicleCategoryId: "car" });
    const truck = calculateRoadTripRoute({ origin, destination, vehicleCategoryId: "truck_3axles" });
    expect(truck.tollTotalBRL).toBeGreaterThan(car.tollTotalBRL);
  });
});
