import React from "react";
import { render, screen } from "@testing-library/react";
import { useSectionManager } from "./useSectionManager";
import { getMediaHeight } from "../constants/led";
import { loadAllMediaFromIndexedDB, saveMediaToIndexedDB } from "../utils/indexedDB";

jest.mock("../utils/socket", () => ({ socket: { on: jest.fn(), off: jest.fn() } }));
jest.mock("../utils/indexedDB", () => ({
  saveMediaToIndexedDB: jest.fn(),
  deleteMediaFromIndexedDB: jest.fn(),
  loadAllMediaFromIndexedDB: jest.fn(),
}));

const SAVED_IMAGE = { type: "image", url: "data:image/png;base64,AAAA", base64: "data:image/png;base64,AAAA" };

function Harness() {
  const { sections } = useSectionManager([5]);
  return (
    <div>
      {sections.top}
      {sections.middle}
    </div>
  );
}

const customSectionLogo = (container) =>
  container.querySelector("#custom-section-5 .logo-3, #custom-section-5 .logo-4");

beforeEach(() => {
  // CRA 테스트 설정(resetMocks)이 매 테스트 전에 목 반환값을 지우므로 여기서 지정
  loadAllMediaFromIndexedDB.mockResolvedValue({ 5: SAVED_IMAGE });
  saveMediaToIndexedDB.mockResolvedValue();
  localStorage.clear();
  localStorage.setItem("customSections", "[5]");
  localStorage.setItem("activeSections", "[5]");
});

test("로고 표시를 켜면 위에 로고, 아래 이미지는 128x206", async () => {
  localStorage.setItem("customSectionLogos", JSON.stringify({ 5: true }));

  const { container } = render(<Harness />);
  const img = await screen.findByAltText("Custom section 5");

  expect(img.style.height).toBe("206px");
  expect(img.style.width).toBe("128px");
  expect(customSectionLogo(container)).not.toBeNull();
});

test("로고 표시를 끄면 로고 없이 이미지가 전체화면 128x256", async () => {
  localStorage.setItem("customSectionLogos", JSON.stringify({ 5: false }));

  const { container } = render(<Harness />);
  const img = await screen.findByAltText("Custom section 5");

  expect(img.style.height).toBe("256px");
  expect(customSectionLogo(container)).toBeNull();
});

test("로고 표시 설정이 없던 예전 섹션은 전체화면", async () => {
  const { container } = render(<Harness />);
  const img = await screen.findByAltText("Custom section 5");

  expect(img.style.height).toBe("256px");
  expect(customSectionLogo(container)).toBeNull();
});

test("미디어 높이: 로고 켜면 206, 끄면 256", () => {
  expect(getMediaHeight(true)).toBe(206);
  expect(getMediaHeight(false)).toBe(256);
});
