import { translate } from "@/lib/i18n";
import { captureException } from "@/lib/sentry";
import { cleanup, render, screen, setup } from "@/lib/test-utils";
import { ErrorBoundary, ErrorFallback } from "./error-fallback";

jest.mock("@/lib/sentry", () => ({
  captureException: jest.fn(),
}));

jest.mock("@/lib/i18n", () => ({
  ...jest.requireActual("@/lib/i18n"),
  translate: jest.fn(),
}));

const captureExceptionMock = captureException as jest.Mock;
const translateMock = translate as unknown as jest.Mock;
const realTranslate = jest.requireActual("@/lib/i18n").translate;
const MESSAGE_RE = /An unexpected error occurred/;

beforeEach(() => {
  translateMock.mockImplementation(realTranslate);
});

afterEach(() => {
  cleanup();
  captureExceptionMock.mockReset();
  translateMock.mockReset();
});

describe("ErrorFallback", () => {
  it("renders the title, message, and retry button", () => {
    render(<ErrorFallback onRetry={jest.fn()} testID="fallback" />);
    expect(screen.getByText("Something went wrong")).toBeOnTheScreen();
    expect(screen.getByText(MESSAGE_RE)).toBeOnTheScreen();
    expect(screen.getByTestId("fallback-retry")).toBeOnTheScreen();
    expect(screen.getByText("Try again")).toBeOnTheScreen();
  });

  it("calls onRetry when the retry button is pressed", async () => {
    const onRetry = jest.fn();
    const { user } = setup(
      <ErrorFallback onRetry={onRetry} testID="fallback" />
    );
    await user.press(screen.getByTestId("fallback-retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders English literals when i18n is not ready (returns the raw key)", () => {
    // Simulate a cold-start crash before i18next init: translate echoes the key.
    translateMock.mockImplementation((key: string) => key);
    render(<ErrorFallback onRetry={jest.fn()} testID="fallback" />);
    expect(screen.getByText("Something went wrong")).toBeOnTheScreen();
    expect(screen.getByText(MESSAGE_RE)).toBeOnTheScreen();
    expect(screen.getByText("Try again")).toBeOnTheScreen();
    expect(screen.queryByText("error_boundary.title")).not.toBeOnTheScreen();
    expect(screen.queryByText("error_boundary.message")).not.toBeOnTheScreen();
  });

  it("shows the error message in __DEV__", () => {
    render(
      <ErrorFallback
        error={new Error("boom detail")}
        onRetry={jest.fn()}
        testID="fallback"
      />
    );
    // __DEV__ is true under jest, so technical detail is rendered.
    expect(screen.getByText("boom detail")).toBeOnTheScreen();
  });
});

describe("ErrorBoundary", () => {
  it("renders the fallback and reports the error once", () => {
    const error = new Error("kaboom");
    render(<ErrorBoundary error={error} retry={jest.fn()} />);

    expect(screen.getByText("Something went wrong")).toBeOnTheScreen();
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("reports only once across re-renders of the same error", () => {
    const error = new Error("same error");
    const { rerender } = render(
      <ErrorBoundary error={error} retry={jest.fn()} />
    );
    rerender(<ErrorBoundary error={error} retry={jest.fn()} />);
    rerender(<ErrorBoundary error={error} retry={jest.fn()} />);

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
  });

  it("reports again for a distinct error", () => {
    const first = new Error("first");
    const { rerender } = render(
      <ErrorBoundary error={first} retry={jest.fn()} />
    );
    const second = new Error("second");
    rerender(<ErrorBoundary error={second} retry={jest.fn()} />);

    expect(captureExceptionMock).toHaveBeenCalledTimes(2);
    expect(captureExceptionMock).toHaveBeenNthCalledWith(1, first);
    expect(captureExceptionMock).toHaveBeenNthCalledWith(2, second);
  });

  it("wires the retry callback through to the fallback", async () => {
    const retry = jest.fn();
    const { user } = setup(
      <ErrorBoundary error={new Error("x")} retry={retry} />
    );
    await user.press(screen.getByTestId("error-boundary-retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
