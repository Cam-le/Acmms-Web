// =================== SOILS MOCK DATA ===================

export interface Soil {
  soilId: string;
  name: string;
  scienceName: string;
  cropsCount: number;
  plotsCount: number;
}

export const mockSoils: Soil[] = [
  {
    soilId: "4585a1da-82af-4e76-9405-4dfc103d16c6",
    name: "Đất phù sa",
    scienceName: "Fluvisol",
    cropsCount: 2,
    plotsCount: 3,
  },
  {
    soilId: "ba34c923-d893-456f-b1be-f8c3da732c83",
    name: "Đất thịt pha cát",
    scienceName: "Loamy soil",
    cropsCount: 1,
    plotsCount: 0,
  },
  {
    soilId: "c1e2d3f4-aaaa-bbbb-cccc-111122223333",
    name: "Đất sét",
    scienceName: "Clayey soil",
    cropsCount: 0,
    plotsCount: 2,
  },
  {
    soilId: "d4e5f6a7-bbbb-cccc-dddd-444455556666",
    name: "Đất cát",
    scienceName: "Sandy soil",
    cropsCount: 3,
    plotsCount: 1,
  },
  {
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    name: "Đất thịt",
    scienceName: "Loam",
    cropsCount: 4,
    plotsCount: 5,
  },
  {
    soilId: "f0a1b2c3-dddd-eeee-ffff-000011112222",
    name: "Đất mùn",
    scienceName: "Humus soil",
    cropsCount: 1,
    plotsCount: 1,
  },
  {
    soilId: "a1b2c3d4-eeee-ffff-0000-333344445555",
    name: "Đất feralit đỏ vàng",
    scienceName: "Ferralsol",
    cropsCount: 0,
    plotsCount: 0,
  },
  {
    soilId: "b2c3d4e5-ffff-0000-1111-666677778888",
    name: "Đất than bùn",
    scienceName: "Histosol",
    cropsCount: 0,
    plotsCount: 0,
  },
];
