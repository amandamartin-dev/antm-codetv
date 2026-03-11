export function validateDependencyEdge(
  issueId: string,
  blockedByIssueId: string,
  exists: boolean,
) {
  if (issueId === blockedByIssueId) {
    throw new Error("Issue cannot depend on itself");
  }

  if (exists) {
    throw new Error("Dependency already exists");
  }
}
