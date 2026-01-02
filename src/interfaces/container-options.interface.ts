export interface ContainerOptions {
  /**
   * 是否允许运行时从 parent 容器查询服务
   * - true: 本容器找不到时向 parent 递归查询（默认）
   * - false: 仅查询本容器，不查询 parent
   */
  inherit?: boolean;
}
