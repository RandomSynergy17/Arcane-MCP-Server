/**
 * Shared type definitions for Arcane MCP Server tools.
 * These match the Arcane API response shapes.
 *
 * Extracted from individual tool files to prevent interface drift
 * and provide a single source of truth for API types.
 */

// === Containers ===

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: string;
  ports?: Array<{ privatePort: number; publicPort?: number; type: string }>;
  labels?: Record<string, string>;
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
  usageData?: { size: number; refCount: number };
}

export interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
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
  services: Array<{
    name: string;
    status: string;
    containerCount?: number;
  }>;
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
  ipam?: {
    driver: string;
    config?: Array<{ subnet?: string; gateway?: string }>;
  };
  containers?: Record<string, { name: string; ipv4Address?: string }>;
  created?: string;
}

// === Network Topology ===

export interface TopologyNode {
  id: string;
  type: string;
  name: string;
  status?: string;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type?: string;
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
  createdAt?: string;
  updatedAt?: string;
}

// === Builds ===

export interface Build {
  id: string;
  status: string;
  tag?: string;
  platform?: string;
  provider?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface BuildDetails extends Build {
  dockerfile?: string;
  gitUrl?: string;
  buildArgs?: Record<string, string>;
  logs?: string;
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
  containers: { total: number; running: number; stopped: number };
  projects: { total: number; running: number; stopped: number };
  images: { total: number; updatesAvailable: number };
  volumes: { total: number; totalSize?: string };
  networks: { total: number };
  systemInfo?: { dockerVersion?: string; osType?: string; cpus?: number; memoryBytes?: number };
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
  path: string;
  targetProjectId?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  autoSync: boolean;
  syncInterval?: number;
}

export interface GitRepository {
  id: string;
  name: string;
  url: string;
  branch: string;
  authType: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

// === Jobs ===

export interface Job {
  id: string;
  name: string;
  type: string;
  status: string;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
  enabled: boolean;
}

// === Ports ===

export interface PortMapping {
  containerName: string;
  containerId: string;
  privatePort: number;
  publicPort?: number;
  protocol: string;
  ip?: string;
}

// === Registries ===

export interface ContainerRegistry {
  id: string;
  name: string;
  url: string;
  type: string;
  username?: string;
  createdAt?: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

// === Swarm ===

export interface SwarmService {
  id: string;
  name: string;
  image: string;
  replicas: number;
  desiredReplicas: number;
  ports?: Array<{ publishedPort: number; targetPort: number; protocol: string }>;
  updatedAt?: string;
  mode?: string;
}

export interface SwarmClusterInfo {
  id: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  managerCount: number;
  workerCount: number;
}

// === Templates ===

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  logo?: string;
  source?: string;
  createdAt?: string;
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
  url?: string;
  token?: string;
  enabled: boolean;
  events?: string[];
  createdAt?: string;
  lastTriggeredAt?: string;
}
