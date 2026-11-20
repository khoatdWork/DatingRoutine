import { choices, readProjectConfig } from "./project-config.mjs";

try {
  const config = readProjectConfig();
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--hosting"))
    throw new Error("Cách dùng: node scripts/check-project.mjs [--hosting <provider>]");
  if (args[0] === "--hosting" && args[1] !== config.hostingProvider)
    throw new Error(
      `Dự án đã chọn ${choices.hosting[config.hostingProvider]}. Lệnh này yêu cầu hosting ${args[1]}. Chạy npm run setup để đổi lựa chọn có xác nhận.`,
    );
  console.log(
    `Dự án: ${config.appName} · ${choices.data[config.dataProvider]} · ${choices.hosting[config.hostingProvider]}`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
