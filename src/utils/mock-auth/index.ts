// Mock Auth for Fast Prototyping
// No real authentication - just for UI/flow testing

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  },
];

// Mock credentials
const VALID_CREDENTIALS = [
  { email: 'test@example.com', password: 'Test123' },
  { email: 'admin@example.com', password: 'Admin123' },
];

export async function mockLogin(email: string, password: string): Promise<MockUser | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const validCred = VALID_CREDENTIALS.find(
    c => c.email === email && c.password === password
  );
  
  if (!validCred) {
    return null;
  }
  
  const user = MOCK_USERS.find(u => u.email === email);
  return user || null;
}

export async function mockSignup(email: string, password: string, name: string): Promise<MockUser> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const newUser: MockUser = {
    id: String(MOCK_USERS.length + 1),
    email,
    name,
    role: 'user',
  };
  
  MOCK_USERS.push(newUser);
  return newUser;
}

export async function mockGetUser(userId: string): Promise<MockUser | null> {
  return MOCK_USERS.find(u => u.id === userId) || null;
}

export async function mockLogout(): Promise<void> {
  // Just a placeholder
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Store current user in memory (in real app, would be in session/cookies)
let currentUser: MockUser | null = null;

export function setCurrentUser(user: MockUser | null) {
  currentUser = user;
}

export function getCurrentUser(): MockUser | null {
  return currentUser;
}

