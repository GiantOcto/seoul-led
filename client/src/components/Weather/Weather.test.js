import { render, screen, act } from "@testing-library/react";
import Weather from "./Weather";

const AIR_KOREA_OK = { response: { body: { items: [{ pm10Value: "20", pm25Value: "10" }] } } };
const AIR_KOREA_EMPTY = { response: { header: { resultCode: "99" }, body: { items: [] } } };

function jsonResponse(body) {
  return Promise.resolve({ json: () => Promise.resolve(body) });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  global.fetch = jest.fn();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
});

test("에어코리아에 측정소 이름(서초구)으로 요청한다", async () => {
  global.fetch.mockImplementation(() => jsonResponse(AIR_KOREA_OK));
  render(<Weather />);
  await flush();
  expect(global.fetch.mock.calls[0][0]).toContain(`stationName=${encodeURIComponent("서초구")}`);
  expect(screen.getAllByText("좋음").length).toBe(2);
});

test("둘 다 실패하면 Loading 을 유지하고 1분 뒤 다시 시도해 성공하면 표시한다", async () => {
  global.fetch.mockImplementation(() => Promise.reject(new Error("offline")));
  render(<Weather />);
  await flush();
  expect(screen.getByText("Loading...")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(2); // 에어코리아 + 서울시

  global.fetch.mockImplementation(() => jsonResponse(AIR_KOREA_OK));
  await act(async () => {
    jest.advanceTimersByTime(60 * 1000);
  });
  await flush();
  expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  expect(screen.getAllByText("좋음").length).toBe(2);
});

test("에어코리아에 데이터가 없으면 서울시 API 새 항목명(MSRSTN_NM/PM/FPM)으로 표시한다", async () => {
  global.fetch
    .mockImplementationOnce(() => jsonResponse(AIR_KOREA_EMPTY))
    .mockImplementationOnce(() =>
      jsonResponse({
        RealtimeCityAir: {
          row: [
            { MSRSTN_NM: "강남구", PM: 200, FPM: 100 },
            { MSRSTN_NM: "서초구", PM: 100, FPM: 40 },
          ],
        },
      })
    );
  render(<Weather />);
  await flush();
  expect(screen.getAllByText("나쁨").length).toBe(2); // 서초구 행: PM 100, FPM 40
});

test("성공 후 1시간이 지나면 새 값으로 갱신한다", async () => {
  global.fetch.mockImplementation(() => jsonResponse(AIR_KOREA_OK));
  render(<Weather />);
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);

  global.fetch.mockImplementation(() =>
    jsonResponse({ response: { body: { items: [{ pm10Value: "200", pm25Value: "100" }] } } })
  );
  await act(async () => {
    jest.advanceTimersByTime(60 * 60 * 1000);
  });
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText("매우나쁨").length).toBe(2);
});

test("1시간 이내 캐시가 있으면 바로 표시하고 남은 시간 뒤에 갱신한다", async () => {
  localStorage.setItem("airQuality_cache_서초구", JSON.stringify({ pm10Value: "20", pm25Value: "10" }));
  localStorage.setItem("airQuality_time_서초구", String(Date.now() - 50 * 60 * 1000));
  global.fetch.mockImplementation(() => jsonResponse(AIR_KOREA_OK));
  render(<Weather />);
  await flush();
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getAllByText("좋음").length).toBe(2);

  await act(async () => {
    jest.advanceTimersByTime(10 * 60 * 1000);
  });
  await flush();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
