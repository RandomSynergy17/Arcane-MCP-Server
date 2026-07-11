/**
 * Shared type definitions for Arcane MCP Server tools.
 * These match the Arcane API response shapes.
 *
 * Extracted from individual tool files to prevent interface drift
 * and provide a single source of truth for API types.
 */

// === Containers ===

/** Container list entry (Docker-style summary: `names` array, `state` string) */
export interface Container {
  id: string;
  names?: string[] | null;
  image: string;
  status: string;
  state: string;
  /** Unix timestamp (seconds) */
  created: number;
  ports?: Array<{ privatePort: number; publicPort?: number; type: string }>;
  labels?: Record<string, string>;
  updateInfo?: { hasUpdate?: boolean };
}

// === Volumes ===

export interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  createdAt: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  /** Docker-cased keys (DockerVolumeUsageData) */
  usageData?: { Size: number; RefCount: number };
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  modTime: string;
  mode: string;
}

export interface Backup {
  id: string;
  volumeName: string;
  size: number;
  createdAt: string;
}

// === Projects ===

export interface ProjectUpdateInfo {
  status: string;
  hasUpdate: boolean;
  imageCount?: number;
  checkedImageCount?: number;
  imagesWithUpdates?: number;
  updatedImageRefs?: string[] | null;
  errorCount?: number;
  errorMessage?: string;
  lastCheckedAt?: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  path?: string;
  serviceCount?: number;
  runningCount?: number;
  /** Runtime state per service (the `services` field holds raw compose configs) */
  runtimeServices?: Array<{
    name: string;
    status: string;
    health?: string;
    image?: string;
    containerName?: string;
  }> | null;
  updateInfo?: ProjectUpdateInfo;
  createdAt?: string;
  updatedAt?: string;
}

// === Images ===

export interface Image {
  id: string;
  repoTags: string[];
  repoDigests?: string[];
  /** Unix timestamp (seconds) */
  created: number;
  size: number;
  virtualSize?: number;
  inUse?: boolean;
}

// === Image Updates ===

export interface ImageUpdateResponse {
  hasUpdate: boolean;
  updateType?: string;
  currentVersion?: string;
  latestVersion?: string;
  currentDigest?: string;
  latestDigest?: string;
  checkTime?: string;
  error?: string;
}

/** Batch check result: image reference → per-image result */
export type BatchImageUpdateResponse = Record<string, ImageUpdateResponse>;

export interface ImageUpdateSummary {
  totalImages: number;
  imagesWithUpdates: number;
  digestUpdates: number;
  errorsCount: number;
}

// === Networks ===

export interface Network {
  id: string;
  name: string;
  driver: string;
  scope: string;
  internal: boolean;
  attachable: boolean;
  inUse?: boolean;
  isDefault?: boolean;
  ipam?: {
    driver: string;
    config?: Array<{ subnet?: string; gateway?: string }>;
  };
  containersList?: Array<{ name: string; ipv4Address?: string; ipv6Address?: string }> | null;
  created?: string;
}

// === Network Topology ===

export interface TopologyNode {
  id: string;
  type: string;
  name: string;
  metadata?: {
    status?: string;
    driver?: string;
    image?: string;
    isDefault?: boolean;
    scope?: string;
  };
}

export interface TopologyEdge {
  id?: string;
  source: string;
  target: string;
  ipv4Address?: string;
  ipv6Address?: string;
}

export interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

// === Environments ===

export interface Environment {
  id: string;
  name: string;
  apiUrl?: string;
  status?: string;
  enabled?: boolean;
  connected?: boolean;
  connectedAt?: string;
  isEdge?: boolean;
  lastSeen?: string;
}

// === Builds ===

export interface Build {
  id: string;
  status: string;
  tags?: string[] | null;
  platforms?: string[] | null;
  provider?: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface BuildDetails extends Build {
  dockerfile?: string;
  buildArgs?: Record<string, string>;
  output?: string;
  outputTruncated?: boolean;
}

export interface WorkspaceFile {
  name: string;
  path: string;
  size?: number;
  isDirectory: boolean;
  modifiedAt?: string;
}

// === Dashboard ===

export interface DashboardSnapshot {
  containers?: {
    counts?: { totalContainers: number; runningContainers: number; stoppedContainers: number };
  };
  imageUsageCounts?: {
    totalImages: number;
    totalImageSize: number;
    imagesInuse: number;
    imagesUnused: number;
  };
  actionItems?: {
    items?: Array<{ kind: string; severity?: string; count: number }> | null;
  };
  versionInfo?: {
    currentVersion?: string;
    newestVersion?: string;
    releaseUrl?: string;
  };
}

// === Events ===

export interface Event {
  id: string;
  type: string;
  title: string;
  description?: string;
  severity: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  userId?: string;
  username?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// === GitOps ===

export interface GitOpsSync {
  id: string;
  name: string;
  repositoryId: string;
  branch: string;
  composePath: string;
  projectId?: string;
  projectName?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncCommit?: string;
  lastSyncError?: string;
  autoSync: boolean;
  syncDirectory?: boolean;
  syncInterval?: number;
}

export interface GitRepository {
  id: string;
  name: string;
  url: string;
  authType: string;
  description?: string;
  username?: string;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// === Jobs ===

export interface Job {
  id: string;
  name: string;
  description?: string;
  category: string;
  enabled: boolean;
  schedule?: string;
  nextRun?: string;
  canRunManually?: boolean;
  isContinuous?: boolean;
}

// === Ports ===

export interface PortMapping {
  id: string;
  containerName: string;
  containerId: string;
  containerPort: number;
  hostPort?: number;
  hostIp?: string;
  protocol: string;
  isPublished?: boolean;
}

// === Registries ===

export interface ContainerRegistry {
  id: string;
  url: string;
  registryType: string;
  description?: string;
  username?: string;
  insecure?: boolean;
  enabled?: boolean;
  awsAccessKeyId?: string;
  awsRegion?: string;
  createdAt?: string;
  updatedAt?: string;
}

// === Swarm ===

export interface SwarmService {
  id: string;
  name: string;
  image: string;
  mode?: string;
  /** Desired replica count */
  replicas: number;
  /** Currently running replicas */
  runningReplicas: number;
  ports?: Array<{ publishedPort: number; targetPort: number; protocol: string }> | null;
  stackName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SwarmClusterInfo {
  id: string;
  createdAt: string;
  updatedAt: string;
  rootRotationInProgress?: boolean;
}

// === Templates ===

export interface Template {
  id: string;
  name: string;
  description?: string;
  content?: string;
  envContent?: string;
  isCustom?: boolean;
  isRemote?: boolean;
  registryId?: string;
  registry?: { id: string; name: string; url?: string; description?: string; enabled?: boolean };
  metadata?: Record<string, unknown>;
}

// === Updater ===

export interface UpdaterResourceResult {
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  status: string;
  updateAvailable?: boolean;
  updateApplied?: boolean;
  oldImages?: Record<string, string>;
  newImages?: Record<string, string>;
  error?: string;
}

export interface UpdaterResult {
  checked: number;
  updated: number;
  failed: number;
  skipped: number;
  items: UpdaterResourceResult[];
}

export interface UpdaterStatus {
  containerIds: string[];
  projectIds: string[];
  updatingContainers: number;
  updatingProjects: number;
}

export interface UpdateRecord {
  id: string;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  status: string;
  updateApplied?: boolean;
  oldImageVersions?: Record<string, unknown>;
  newImageVersions?: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  error?: string;
}

// === Users ===

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  isGlobalAdmin?: boolean;
  createdAt: string;
  oidcSubjectId?: string;
}

// === Vulnerabilities ===

export interface SeveritySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unknown?: number;
}

export interface ScanResult {
  imageId: string;
  imageName?: string;
  status: string;
  scanPhase?: string;
  scanTime?: string;
  duration?: number;
  error?: string;
  summary?: SeveritySummary;
}

export interface Vulnerability {
  vulnerabilityId: string;
  pkgName: string;
  installedVersion?: string;
  fixedVersion?: string;
  severity: string;
  title?: string;
  description?: string;
  imageName?: string;
}

export interface IgnoredVulnerability {
  id: string;
  vulnerabilityId: string;
  pkgName?: string;
  installedVersion?: string;
  imageId?: string;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
}

// === Webhooks ===

export interface Webhook {
  id: string;
  name: string;
  enabled: boolean;
  actionType?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  tokenPrefix?: string;
  environmentId?: string;
  createdAt?: string;
  lastTriggeredAt?: string;
}
