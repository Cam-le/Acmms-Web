// =================== MOCK AUTH ACCOUNTS ===================
// Used as fallback when API is unreachable

export interface MockAccount {
  userId: string;
  email: string;
  password: string;
  fullname: string;
  phoneNumber: string;
  roleName: "Admin" | "Owner" | "Specialist";
}

export const mockAccounts: MockAccount[] = [
  {
    userId: "mock-001",
    email: "admin@gmail.com",
    password: "123456",
    fullname: "Nguyễn Văn Admin",
    phoneNumber: "0909000001",
    roleName: "Admin",
  },
  {
    userId: "mock-002",
    email: "owner@gmail.com",
    password: "123456",
    fullname: "Nguyễn Văn Chủ",
    phoneNumber: "0909000002",
    roleName: "Owner",
  },
  {
    userId: "mock-003",
    email: "specialist@gmail.com",
    password: "123456",
    fullname: "TS. Sarah Field",
    phoneNumber: "0909000003",
    roleName: "Specialist",
  },
];
