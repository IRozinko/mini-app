import { expect, test } from "@playwright/test";

test("registers a user, creates a decision, and shows it on dashboard", async ({
  page
}) => {
  const email = `smoke-${Date.now()}@example.com`;
  const password = "password-12345";
  const decision = "Запустити невеликий MVP перед повним релізом продукту";

  await page.goto("/register");
  await page.getByLabel("Ім'я").fill("Smoke User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Зареєструватися" }).click();

  await expect(page.getByRole("heading", { name: "Історія рішень" })).toBeVisible();

  await page.getByRole("link", { name: "Новий запис" }).first().click();
  await page
    .getByLabel("Опис ситуації")
    .fill("Команда вагається між великим релізом і меншим MVP для перевірки попиту.");
  await page.getByLabel("Прийняте рішення").fill(decision);
  await page
    .getByLabel("Власні міркування")
    .fill("MVP швидше дасть реальні дані й обмежить ризик помилки.");
  await page.getByRole("button", { name: "Зберегти і проаналізувати" }).click();

  await expect(page.getByText("Аналіз рішення")).toBeVisible();
  await page.getByRole("link", { name: "Історія рішень" }).click();

  await expect(page.getByText(decision)).toBeVisible();
  await expect(page.getByText("Тестовий LLM-аналіз")).toBeVisible();
});
