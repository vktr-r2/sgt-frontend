const mockNavigate = jest.fn();

module.exports = {
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }) => children,
  Route: ({ children }) => children,
  Routes: ({ children }) => children,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
  Navigate: () => null,
  __mockNavigate: mockNavigate,
};
