import { render, screen } from "@/lib/test-utils";

jest.mock("@/components/ui", () => {
  const { Text, View } = require("react-native");

  return {
    AnimatedListItem: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    Button: ({ label }: { label: string }) => <Text>{label}</Text>,
    EmptyState: ({ testID, title }: { testID?: string; title: string }) => (
      <Text testID={testID}>{title}</Text>
    ),
    FocusAwareStatusBar: () => null,
    List: ({
      data,
      renderItem,
      keyExtractor,
      ListEmptyComponent,
    }: {
      data: unknown[];
      renderItem: (info: { item: unknown; index: number }) => React.ReactNode;
      keyExtractor: (item: unknown, index: number) => string;
      ListEmptyComponent?: React.ReactNode;
    }) =>
      data.length === 0 ? (
        ListEmptyComponent
      ) : (
        <View>
          {data.map((item, index) => (
            <View key={keyExtractor(item, index)}>
              {renderItem({ item, index })}
            </View>
          ))}
        </View>
      ),
    SkeletonList: ({ testID }: { testID?: string }) => (
      <Text testID={testID}>loading</Text>
    ),
    Text,
    View,
  };
});

interface MockSessionState {
  data: { session?: { token: string } } | null;
  isPending: boolean;
}

let mockSession: MockSessionState = { data: null, isPending: false };
jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => mockSession,
  },
}));

const mockUseSessions = jest.fn();
jest.mock("../use-sessions", () => ({
  useSessions: () => mockUseSessions(),
}));

jest.mock("expo-router", () => {
  const { Text } = require("react-native");
  return {
    Redirect: ({ href }: { href: string }) => (
      <Text testID="redirect">{href}</Text>
    ),
    useIsFocused: () => true,
    Stack: {
      Screen: () => null,
    },
  };
});

jest.mock("../components/session-row", () => ({
  SessionRow: ({ isCurrent }: { isCurrent: boolean }) => {
    const { Text } = require("react-native");
    return <Text testID="session-row">{isCurrent ? "current" : "other"}</Text>;
  },
}));

function loadScreen() {
  let mod: typeof import("../sessions-screen") | undefined;
  jest.isolateModules(() => {
    mod = require("../sessions-screen");
  });
  if (!mod) {
    throw new Error("SessionsScreen module did not load");
  }
  return mod.SessionsScreen;
}

describe("SessionsScreen", () => {
  beforeEach(() => {
    mockSession = { data: null, isPending: false };
    mockUseSessions.mockReset();
    mockUseSessions.mockReturnValue({
      sessions: [],
      loading: false,
      refresh: jest.fn(),
      revoke: jest.fn(),
    });
  });

  it("redirects when there is no authenticated session", () => {
    const SessionsScreen = loadScreen();
    render(<SessionsScreen />);

    expect(screen.getByTestId("redirect")).toHaveTextContent("/login");
    expect(mockUseSessions).not.toHaveBeenCalled();
  });

  it("redirects when the auth client returns data without a session", () => {
    mockSession = { data: {}, isPending: false };
    const SessionsScreen = loadScreen();
    render(<SessionsScreen />);

    expect(screen.getByTestId("redirect")).toHaveTextContent("/login");
    expect(mockUseSessions).not.toHaveBeenCalled();
  });

  it("marks the current session by token when authenticated", () => {
    mockSession = {
      data: { session: { token: "current-token" } },
      isPending: false,
    };
    mockUseSessions.mockReturnValue({
      sessions: [
        {
          id: "s1",
          token: "current-token",
          createdAt: new Date(),
        },
      ],
      loading: false,
      refresh: jest.fn(),
      revoke: jest.fn(),
    });

    const SessionsScreen = loadScreen();
    render(<SessionsScreen />);

    expect(screen.getByTestId("session-row")).toHaveTextContent("current");
  });
});
