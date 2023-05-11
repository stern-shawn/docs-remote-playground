import { readdir, stat } from 'node:fs/promises';
import path from 'path';

//? Get a flattened list of all files within a given directory and its subdirectories
export const getAllPaths = async (directoryPath: string) => {
  let paths: string[] = [];
  const files = await readdir(directoryPath);

  for await (const file of files) {
    const filePath = path.join(directoryPath, file);
    const fileStats = await stat(filePath);

    // If the file is a directory, recursively get its contents
    if (fileStats.isDirectory()) {
      paths = paths.concat(await getAllPaths(filePath));
    } else {
      paths.push(filePath);
    }
  }

  return paths;
};
