export default function () {
  if (process.platform !== 'linux') {
    throw new Error(
      'Unable to compare screenshots outside Linux. Run them with ' +
      "`pnpm test:screenshots`, in Playwright's Docker image."
    )
  }
}
