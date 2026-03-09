// =================== MOCK AUTH ACCOUNTS ===================
// Used as fallback when API is unreachable

export interface MockAccount {
  userId: string;
  email: string;
  password: string;
  fullname: string;
  phoneNumber: string;
  roleName: string;
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
];
