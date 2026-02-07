const mockNavigate = jest.fn();
const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = jest.fn();
const mockLocation = { state: null };

module.exports = {
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  useLocation: () => mockLocation,
  BrowserRouter: ({ children }) => children,
  Route: ({ children }) => children,
  Routes: ({ children }) => children,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  __mockNavigate: mockNavigate,
  __mockSearchParams: mockSearchParams,
  __mockSetSearchParams: mockSetSearchParams,
  __mockLocation: mockLocation,
  __setMockSearchParams: (params) => {
    mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
    Object.entries(params).forEach(([key, value]) => mockSearchParams.set(key, value));
  },
  __setMockLocation: (location) => {
    Object.assign(mockLocation, location);
  },
};
