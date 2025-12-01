import fs from "fs";

export async function createImageFromFile(path: string): Promise<string> {
    const data = fs.readFileSync(path);
    return "data:image/png;base64," + data.toString("base64");
}
