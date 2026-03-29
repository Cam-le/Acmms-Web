// =================== SOILS MOCK DATA ===================

// ── ERD: Soil ────────────────────────────────────────────────────────────────
export interface Soil {
  soilId: string;
  name: string;
  scienceName: string;
}

// ── ERD: Soil_crop_Compatibility ─────────────────────────────────────────────
export type CompatibilityLevel = "Tốt" | "Trung bình" | "Kém";

export interface SoilCropCompatibility {
  comptId: string;
  soilId: string;
  cropId: string;
  compatibility: CompatibilityLevel;
  note: string;
}

// ── Soils ─────────────────────────────────────────────────────────────────────
export const mockSoils: Soil[] = [
  {
    soilId: "4585a1da-82af-4e76-9405-4dfc103d16c6",
    name: "Đất phù sa",
    scienceName: "Fluvisol",
  },
  {
    soilId: "ba34c923-d893-456f-b1be-f8c3da732c83",
    name: "Đất thịt pha cát",
    scienceName: "Loamy soil",
  },
  {
    soilId: "c1e2d3f4-aaaa-bbbb-cccc-111122223333",
    name: "Đất sét",
    scienceName: "Clayey soil",
  },
  {
    soilId: "d4e5f6a7-bbbb-cccc-dddd-444455556666",
    name: "Đất cát",
    scienceName: "Sandy soil",
  },
  {
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    name: "Đất thịt",
    scienceName: "Loam",
  },
  {
    soilId: "f0a1b2c3-dddd-eeee-ffff-000011112222",
    name: "Đất mùn",
    scienceName: "Humus soil",
  },
  {
    soilId: "a1b2c3d4-eeee-ffff-0000-333344445555",
    name: "Đất feralit đỏ vàng",
    scienceName: "Ferralsol",
  },
  {
    soilId: "b2c3d4e5-ffff-0000-1111-666677778888",
    name: "Đất than bùn",
    scienceName: "Histosol",
  },
];

// ── Soil-Crop Compatibility records ──────────────────────────────────────────
// Crop IDs match mockCrops in mockData.ts:
//   "1" Bắp Cải Trắng · "2" Bắp Cải Tím · "3" Bắp Cải Xoăn (Kale)
//   "4" Bắp Cải Bruxen · "5" Bắp Cải Thảo · "6" Súp Lơ Xanh · "7" Súp Lơ Trắng
export const mockSoilCropCompatibilities: SoilCropCompatibility[] = [
  // Đất phù sa
  {
    comptId: "compt-01",
    soilId: "4585a1da-82af-4e76-9405-4dfc103d16c6",
    cropId: "1",
    compatibility: "Tốt",
    note: "Phù sa giàu dinh dưỡng, thoát nước tốt, rất thích hợp cho bắp cải trắng.",
  },
  {
    comptId: "compt-02",
    soilId: "4585a1da-82af-4e76-9405-4dfc103d16c6",
    cropId: "3",
    compatibility: "Tốt",
    note: "Kale phát triển mạnh trên đất phù sa nhờ độ ẩm ổn định.",
  },
  {
    comptId: "compt-03",
    soilId: "4585a1da-82af-4e76-9405-4dfc103d16c6",
    cropId: "7",
    compatibility: "Trung bình",
    note: "Súp lơ trắng có thể trồng được nhưng cần bổ sung phân bón thêm.",
  },
  // Đất thịt pha cát
  {
    comptId: "compt-04",
    soilId: "ba34c923-d893-456f-b1be-f8c3da732c83",
    cropId: "1",
    compatibility: "Tốt",
    note: "Thoát nước nhanh, phù hợp với bắp cải trắng trồng mùa mưa.",
  },
  {
    comptId: "compt-05",
    soilId: "ba34c923-d893-456f-b1be-f8c3da732c83",
    cropId: "5",
    compatibility: "Tốt",
    note: "Bắp cải thảo ưa đất tơi xốp, loại đất này rất phù hợp.",
  },
  // Đất sét
  {
    comptId: "compt-06",
    soilId: "c1e2d3f4-aaaa-bbbb-cccc-111122223333",
    cropId: "4",
    compatibility: "Trung bình",
    note: "Đất sét giữ nước tốt nhưng dễ úng, cần lên luống cao cho bắp cải Bruxen.",
  },
  {
    comptId: "compt-07",
    soilId: "c1e2d3f4-aaaa-bbbb-cccc-111122223333",
    cropId: "2",
    compatibility: "Kém",
    note: "Đất sét nặng không phù hợp cho bắp cải tím, năng suất thấp.",
  },
  // Đất cát
  {
    comptId: "compt-08",
    soilId: "d4e5f6a7-bbbb-cccc-dddd-444455556666",
    cropId: "5",
    compatibility: "Trung bình",
    note: "Cần tưới thường xuyên do đất cát thoát nước quá nhanh.",
  },
  {
    comptId: "compt-09",
    soilId: "d4e5f6a7-bbbb-cccc-dddd-444455556666",
    cropId: "1",
    compatibility: "Kém",
    note: "Đất cát nghèo dinh dưỡng, cần bổ sung nhiều phân hữu cơ.",
  },
  {
    comptId: "compt-10",
    soilId: "d4e5f6a7-bbbb-cccc-dddd-444455556666",
    cropId: "3",
    compatibility: "Trung bình",
    note: "Kale chịu được đất cát nhưng cần bón phân định kỳ.",
  },
  // Đất thịt
  {
    comptId: "compt-11",
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    cropId: "2",
    compatibility: "Tốt",
    note: "Đất thịt cân bằng dinh dưỡng và độ ẩm, lý tưởng cho bắp cải tím.",
  },
  {
    comptId: "compt-12",
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    cropId: "6",
    compatibility: "Tốt",
    note: "Súp lơ xanh phát triển rất tốt trên đất thịt.",
  },
  {
    comptId: "compt-13",
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    cropId: "4",
    compatibility: "Tốt",
    note: "Bắp cải Bruxen ưa đất thịt, cho năng suất cao.",
  },
  {
    comptId: "compt-14",
    soilId: "e7f8a9b0-cccc-dddd-eeee-777788889999",
    cropId: "7",
    compatibility: "Trung bình",
    note: "Súp lơ trắng sinh trưởng ổn định, không đặc biệt nổi bật.",
  },
  // Đất mùn
  {
    comptId: "compt-15",
    soilId: "f0a1b2c3-dddd-eeee-ffff-000011112222",
    cropId: "3",
    compatibility: "Tốt",
    note: "Đất mùn giàu hữu cơ rất phù hợp cho Kale.",
  },
  {
    comptId: "compt-16",
    soilId: "f0a1b2c3-dddd-eeee-ffff-000011112222",
    cropId: "6",
    compatibility: "Tốt",
    note: "Súp lơ xanh hấp thụ tốt chất hữu cơ từ đất mùn.",
  },
];
