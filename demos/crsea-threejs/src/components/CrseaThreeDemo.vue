<template>
  <div class="c1-panel">
    <div class="panel-content">
      <div class="loading" v-if="loading">加载中...</div>
      <div class="error" v-else-if="error">{{ error }}</div>
      <div class="content" v-else>
        <!-- 左侧侧边栏 -->
        <div class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
          <div class="sidebar-header">
            <span class="sidebar-title">巷道列表</span>
            <button class="sidebar-toggle" @click="toggleSidebar">
              {{ sidebarCollapsed ? '展开' : '收起' }}
            </button>
          </div>
          <div class="sidebar-content" v-if="!sidebarCollapsed">
            <!-- 控制按钮 -->
            <div class="sidebar-controls">
              <button class="control-btn" @click="resetCameraView">
                重置视角
              </button>
              <div class="control-tips">
                <div class="tip-item">
                  <span class="tip-key">鼠标左键拖拽</span>
                  <span class="tip-desc">旋转视角</span>
                </div>
                <div class="tip-item">
                  <span class="tip-key">鼠标滚轮</span>
                  <span class="tip-desc">缩放</span>
                </div>
                <div class="tip-item">
                  <span class="tip-key">鼠标右键拖拽</span>
                  <span class="tip-desc">平移</span>
                </div>
                <div class="tip-item">
                  <span class="tip-key">坐标轴</span>
                  <span class="tip-desc">红X 绿Y 蓝Z</span>
                </div>
                <div class="tip-item">
                  <span class="tip-key">选中巷道</span>
                  <span class="tip-desc">白色高亮</span>
                </div>
              </div>
            </div>
            
            <!-- 巷道树形列表 -->
            <div class="tunnel-tree">
              <div 
                v-for="node in treeData" 
                :key="node.id"
                class="tree-node"
                :class="{ 
                  'expanded': node.expanded,
                  'selected': (selectedTunnel && selectedTunnel.id === node.id) || (selectedWorkface && selectedWorkface.id === node.id),
                  'level-1': node.level === 1,
                  'level-2': node.level === 2,
                  'level-3': node.level === 3,
                  'level-4': node.level === 4
                }"
              >
                <div class="node-content">
                  <span 
                    v-if="node.children && node.children.length > 0"
                    class="expand-icon"
                    @click.stop="toggleNode(node)"
                  >
                    {{ node.expanded ? '▼' : '▶' }}
                  </span>
                  <span v-else class="expand-icon-placeholder"></span>
                  
                  <span class="node-icon">{{ getNodeIcon(node.type) }}</span>
                  <span 
                    class="node-name"
                    @click="handleNodeClick(node)"
                  >{{ node.name }}</span>
                  <span v-if="node.tunnelCount" class="tunnel-count">({{ node.tunnelCount }})</span>
                </div>
                
                <!-- 子节点 -->
                <div v-if="node.expanded && node.children" class="children">
                  <div 
                    v-for="child in node.children" 
                    :key="child.id"
                    class="tree-node"
                    :class="{ 
                      'expanded': child.expanded,
                      'selected': (selectedTunnel && selectedTunnel.id === child.id) || (selectedWorkface && selectedWorkface.id === child.id),
                      'level-2': child.level === 2,
                      'level-3': child.level === 3,
                      'level-4': child.level === 4,
                      'level-5': child.level === 5
                    }"
                  >
                    <div class="node-content">
                      <span 
                        v-if="child.children && child.children.length > 0"
                        class="expand-icon"
                        @click.stop="toggleNode(child)"
                      >
                        {{ child.expanded ? '▼' : '▶' }}
                      </span>
                      <span v-else class="expand-icon-placeholder"></span>
                      
                      <span class="node-icon">{{ getNodeIcon(child.type) }}</span>
                      <span 
                        class="node-name"
                        @click="handleNodeClick(child)"
                      >{{ child.name }}</span>
                      <span v-if="child.tunnelCount" class="tunnel-count">({{ child.tunnelCount }})</span>
                    </div>
                    
                    <!-- 三级子节点 -->
                    <div v-if="child.expanded && child.children" class="children">
                      <div 
                        v-for="grandchild in child.children" 
                        :key="grandchild.id"
                        class="tree-node"
                        :class="{ 
                          'expanded': grandchild.expanded,
                          'selected': (selectedTunnel && selectedTunnel.id === grandchild.id) || (selectedWorkface && selectedWorkface.id === grandchild.id),
                          'level-3': grandchild.level === 3,
                          'level-4': grandchild.level === 4,
                          'level-5': grandchild.level === 5,
                          'level-6': grandchild.level === 6
                        }"
                      >
                        <div class="node-content">
                          <span 
                            v-if="grandchild.children && grandchild.children.length > 0"
                            class="expand-icon"
                            @click.stop="toggleNode(grandchild)"
                          >
                            {{ grandchild.expanded ? '▼' : '▶' }}
                          </span>
                          <span v-else class="expand-icon-placeholder"></span>
                          
                          <span class="node-icon">{{ getNodeIcon(grandchild.type) }}</span>
                          <span 
                            class="node-name"
                            @click="handleNodeClick(grandchild)"
                          >{{ grandchild.name }}</span>
                          <span v-if="grandchild.tunnelCount" class="tunnel-count">({{ grandchild.tunnelCount }})</span>
                        </div>
                        
                        <!-- 四级子节点 -->
                        <div v-if="grandchild.expanded && grandchild.children" class="children">
                          <div 
                            v-for="greatGrandchild in grandchild.children" 
                            :key="greatGrandchild.id"
                            class="tree-node"
                            :class="{ 
                              'expanded': greatGrandchild.expanded,
                              'selected': (selectedTunnel && selectedTunnel.id === greatGrandchild.id) || (selectedWorkface && selectedWorkface.id === greatGrandchild.id),
                              'level-4': greatGrandchild.level === 4,
                              'level-5': greatGrandchild.level === 5,
                              'level-6': greatGrandchild.level === 6,
                              'level-7': greatGrandchild.level === 7
                            }"
                          >
                            <div class="node-content">
                              <span class="expand-icon-placeholder"></span>
                              <span class="node-icon">{{ getNodeIcon(greatGrandchild.type) }}</span>
                              <span 
                                class="node-name"
                                @click="handleNodeClick(greatGrandchild)"
                              >{{ greatGrandchild.name }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Three.js 3D画图区域 -->
        <div class="threejs-container" ref="threejsContainer">
          <div class="threejs-canvas" ref="threejsCanvas">
            <!-- Three.js渲染器将在这里渲染3D场景 -->
          </div>
          
          <!-- 右下角坐标编辑弹窗 -->
          <div class="coordinate-modal" :class="{ 'modal-visible': showCoordinateModal }">
            <div class="modal-header">
              <span class="modal-title">编辑工作面参照点坐标</span>
              <button class="modal-close" @click="closeCoordinateModal">×</button>
            </div>
            <div class="modal-content" v-if="selectedWorkface">
              <div class="workface-info">
                <h4>{{ selectedWorkface.name }}</h4>
                <p>{{ selectedWorkface.code }} - {{ selectedWorkface.group_name }}</p>
              </div>
              
              <div class="coordinate-form">
                <div class="position-group">
                  <div class="position-label">参照点坐标：</div>
                  <div class="position-inputs">
                    <div class="input-group">
                      <label>X:</label>
                      <a-input-number
                        v-model:value="coordinateForm.reference_point.x"
                        :precision="2"
                        style="width: 80px"
                      />
                    </div>
                    <div class="input-group">
                      <label>Y:</label>
                      <a-input-number
                        v-model:value="coordinateForm.reference_point.y"
                        :precision="2"
                        style="width: 80px"
                      />
                    </div>
                    <div class="input-group">
                      <label>Z:</label>
                      <a-input-number
                        v-model:value="coordinateForm.reference_point.z"
                        :precision="2"
                        style="width: 80px"
                      />
                    </div>
                    <div class="input-group">
                      <label>旋转角度(°):</label>
                      <a-input-number
                        v-model:value="coordinateForm.rotation_angle"
                        :precision="2"
                        :min="0"
                        :max="360"
                        style="width: 100px"
                      />
                    </div>
                  </div>
                </div>
                
                <div class="modal-actions">
                  <a-button @click="closeCoordinateModal">取消</a-button>
                  <a-button type="primary" @click="saveCoordinates" :loading="saving">保存</a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as THREE from 'three'
import { toRaw, markRaw } from 'vue'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import dashboardMock from '../data/c1-dashboard-mock.json'

export default {
  name: 'C1Panel',
  data() {
    return {
      loading: false,
      error: null,
      data: null,
      userType: null,
      userPermissions: null,
      
      // Three.js 相关
      scene: null,
      renderer: null,
      camera: null,
      controls: null,
      raycaster: null,
      mouse: null,
      animationId: null,
      
      // 巷道数据
      tunnels: [],
      workfaces: [],
      treeData: [],
      selectedTunnel: null,
      selectedWorkface: null,
      tunnelMeshes: [],
      
      // UI状态
      sidebarCollapsed: false,
      showCoordinateModal: false,
      saving: false,
      
      // 坐标编辑表单
      coordinateForm: {
        reference_point: { x: 0, y: 0, z: 0 },
        rotation_angle: 0
      }
    }
  },
  mounted() {
    this.fetchData()
  },
  watch: {
    // 监听侧边栏折叠状态变化
    sidebarCollapsed() {
      this.$nextTick(() => {
        setTimeout(() => {
          this.adjustRendererSize()
        }, 300) // 等待CSS过渡动画完成
      })
    }
  },
  methods: {
    // 构建树形数据结构
    buildTreeData() {
      if ((!this.tunnels || this.tunnels.length === 0) && (!this.workfaces || this.workfaces.length === 0)) {
        this.treeData = []
        return
      }
      
      console.log('构建树形数据，用户权限:', this.userPermissions)
      
      // 保存当前展开状态
      const expandedStates = this.getExpandedStates()
      
      // 根据用户权限构建不同的树形结构
      if (this.userPermissions?.can_admin) {
        // 系统管理员：显示完整的树形结构
        this.treeData = this.buildFullTree()
      } else if (this.userPermissions?.is_group_user) {
        // 集团用户：直接显示集团下的煤矿
        this.treeData = this.buildGroupTree()
      } else if (this.userPermissions?.is_mine_user) {
        // 煤矿用户：直接显示煤矿下的工作面
        this.treeData = this.buildMineTree()
      } else {
        // 其他用户：直接显示巷道
        this.treeData = this.buildTunnelTree()
      }
      
      // 恢复展开状态
      this.restoreExpandedStates(expandedStates)
      
      console.log('树形数据构建完成:', this.treeData)
    },
    
    // 获取当前展开状态
    getExpandedStates() {
      const states = {}
      const traverse = (nodes) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            states[node.id] = node.expanded
            traverse(node.children)
          }
        })
      }
      traverse(this.treeData)
      return states
    },
    
    // 恢复展开状态
    restoreExpandedStates(states) {
      const traverse = (nodes) => {
        nodes.forEach(node => {
          if (node.children && node.children.length > 0) {
            if (states.hasOwnProperty(node.id)) {
              node.expanded = states[node.id]
            }
            traverse(node.children)
          }
        })
      }
      traverse(this.treeData)
    },
    
    // 构建完整树形结构（系统管理员）
    buildFullTree() {
      const groups = {}
      
      this.tunnels.forEach(tunnel => {
        const groupName = tunnel.group_name || '未知集团'
        const mineName = tunnel.mine_name || '未知煤矿'
        const workfaceName = tunnel.workface_name || '未知工作面'
        
        if (!groups[groupName]) {
          groups[groupName] = {
            id: `group_${groupName}`,
            name: groupName,
            type: 'group',
            level: 1,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!groups[groupName].children[mineName]) {
          groups[groupName].children[mineName] = {
            id: `mine_${groupName}_${mineName}`,
            name: mineName,
            type: 'mine',
            level: 2,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!groups[groupName].children[mineName].children[workfaceName]) {
          groups[groupName].children[mineName].children[workfaceName] = {
            id: `workface_${groupName}_${mineName}_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 3,
            expanded: true,
            children: [],
            tunnelCount: 0
          }
        }
        
        // 添加巷道
        const tunnelNode = {
          id: tunnel.id,
          name: tunnel.name,
          type: 'tunnel',
          level: 4,
          expanded: false,
          children: [],
          tunnel: tunnel,
          tunnelCount: 0
        }
        
        groups[groupName].children[mineName].children[workfaceName].children.push(tunnelNode)
        groups[groupName].tunnelCount++
        groups[groupName].children[mineName].tunnelCount++
        groups[groupName].children[mineName].children[workfaceName].tunnelCount++
      })
      
      // 处理工作面数据
      this.workfaces.forEach(workface => {
        const groupName = workface.group_name || '未知集团'
        const mineName = workface.mine_name || '未知煤矿'
        const workfaceName = workface.name || '未知工作面'
        
        if (!groups[groupName]) {
          groups[groupName] = {
            id: `group_${groupName}`,
            name: groupName,
            type: 'group',
            level: 1,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!groups[groupName].children[mineName]) {
          groups[groupName].children[mineName] = {
            id: `mine_${groupName}_${mineName}`,
            name: mineName,
            type: 'mine',
            level: 2,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!groups[groupName].children[mineName].children[workfaceName]) {
          groups[groupName].children[mineName].children[workfaceName] = {
            id: `workface_${groupName}_${mineName}_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 3,
            expanded: true,
            children: [],
            tunnelCount: 0,
            workface: workface
          }
        } else {
          // 如果工作面节点已存在，添加工作面数据
          groups[groupName].children[mineName].children[workfaceName].workface = workface
        }
      })
      
      // 转换为数组格式
      return Object.values(groups).map(group => ({
        ...group,
        children: Object.values(group.children).map(mine => ({
          ...mine,
          children: Object.values(mine.children)
        }))
      }))
    },
    
    // 构建集团树形结构（集团用户）
    buildGroupTree() {
      const mines = {}
      
      this.tunnels.forEach(tunnel => {
        const mineName = tunnel.mine_name || '未知煤矿'
        const workfaceName = tunnel.workface_name || '未知工作面'
        
        if (!mines[mineName]) {
          mines[mineName] = {
            id: `mine_${mineName}`,
            name: mineName,
            type: 'mine',
            level: 1,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!mines[mineName].children[workfaceName]) {
          mines[mineName].children[workfaceName] = {
            id: `workface_${mineName}_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 2,
            expanded: true,
            children: [],
            tunnelCount: 0
          }
        }
        
        // 添加巷道
        const tunnelNode = {
          id: tunnel.id,
          name: tunnel.name,
          type: 'tunnel',
          level: 3,
          expanded: false,
          children: [],
          tunnel: tunnel,
          tunnelCount: 0
        }
        
        mines[mineName].children[workfaceName].children.push(tunnelNode)
        mines[mineName].tunnelCount++
        mines[mineName].children[workfaceName].tunnelCount++
      })
      
      // 处理工作面数据
      this.workfaces.forEach(workface => {
        const mineName = workface.mine_name || '未知煤矿'
        const workfaceName = workface.name || '未知工作面'
        
        if (!mines[mineName]) {
          mines[mineName] = {
            id: `mine_${mineName}`,
            name: mineName,
            type: 'mine',
            level: 1,
            expanded: true,
            children: {},
            tunnelCount: 0
          }
        }
        
        if (!mines[mineName].children[workfaceName]) {
          mines[mineName].children[workfaceName] = {
            id: `workface_${mineName}_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 2,
            expanded: true,
            children: [],
            tunnelCount: 0,
            workface: workface
          }
        } else {
          // 如果工作面节点已存在，添加工作面数据
          mines[mineName].children[workfaceName].workface = workface
        }
      })
      
      return Object.values(mines).map(mine => ({
        ...mine,
        children: Object.values(mine.children)
      }))
    },
    
    // 构建煤矿树形结构（煤矿用户）
    buildMineTree() {
      const workfaces = {}
      
      this.tunnels.forEach(tunnel => {
        const workfaceName = tunnel.workface_name || '未知工作面'
        
        if (!workfaces[workfaceName]) {
          workfaces[workfaceName] = {
            id: `workface_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 1,
            expanded: true,
            children: [],
            tunnelCount: 0
          }
        }
        
        // 添加巷道
        const tunnelNode = {
          id: tunnel.id,
          name: tunnel.name,
          type: 'tunnel',
          level: 2,
          expanded: false,
          children: [],
          tunnel: tunnel,
          tunnelCount: 0
        }
        
        workfaces[workfaceName].children.push(tunnelNode)
        workfaces[workfaceName].tunnelCount++
      })
      
      // 处理工作面数据
      this.workfaces.forEach(workface => {
        const workfaceName = workface.name || '未知工作面'
        
        if (!workfaces[workfaceName]) {
          workfaces[workfaceName] = {
            id: `workface_${workfaceName}`,
            name: workfaceName,
            type: 'workface',
            level: 1,
            expanded: true,
            children: [],
            tunnelCount: 0,
            workface: workface
          }
        } else {
          // 如果工作面节点已存在，添加工作面数据
          workfaces[workfaceName].workface = workface
        }
      })
      
      return Object.values(workfaces)
    },
    
    // 构建巷道树形结构（其他用户）
    buildTunnelTree() {
      return this.tunnels.map(tunnel => ({
        id: tunnel.id,
        name: tunnel.name,
        type: 'tunnel',
        level: 1,
        expanded: false,
        children: [],
        tunnel: tunnel,
        tunnelCount: 0
      }))
    },
    
    // 获取节点图标
    getNodeIcon(type) {
      const icons = {
        group: '🏢',
        mine: '⛏️',
        workface: '🔧',
        tunnel: '🚇'
      }
      return icons[type] || '📁'
    },
    
    // 切换节点展开/收起
    toggleNode(node) {
      node.expanded = !node.expanded
    },
    
    // 处理节点点击
    handleNodeClick(node) {
      if (node.type === 'tunnel' && node.tunnel) {
        // 点击巷道节点，只选中不折叠
        this.selectTunnel(node.tunnel)
      } else if (node.type === 'workface' && node.workface) {
        // 点击工作面节点，选中工作面
        this.selectWorkface(node.workface)
      }
      // 其他节点点击不执行任何操作，只有点击展开/折叠图标才切换状态
    },
    
    async fetchData() {
      this.loading = true
      this.error = null
      
      try {
        await new Promise((r) => setTimeout(r, 120))
        const response = { data: dashboardMock }
        console.log('Demo mock (no backend):', response.data)
        
        if (response.data.status === 'success') {
          this.data = response.data.data
          console.log('Data structure:', this.data)
          
          // 安全访问 threejs_data 和 tunnels、workfaces
          if (this.data && this.data.threejs_data) {
            this.tunnels = this.data.threejs_data.tunnels || []
            this.workfaces = this.data.threejs_data.workfaces || []
            console.log('Tunnels loaded:', this.tunnels.length)
            console.log('Workfaces loaded:', this.workfaces.length)
            
            // 调试：输出第一个工作面的数据结构
            if (this.workfaces.length > 0) {
              console.log('第一个工作面数据结构:', this.workfaces[0])
              console.log('第一个工作面所有字段:', Object.keys(this.workfaces[0]))
            }
          } else {
            console.error('threejs_data not found in response')
            this.tunnels = []
            this.workfaces = []
          }
          
          this.userPermissions = this.data?.user_permissions || {}
          
          // 构建树形数据结构
          this.buildTreeData()
          
          // 先设置loading为false，让DOM更新
          this.loading = false
          
          // 使用setTimeout确保DOM完全渲染
          setTimeout(() => {
            this.initThreeJS()
          }, 100)
        } else {
          this.error = response.data.message || '数据加载失败'
          this.loading = false
        }
      } catch (err) {
        this.error = '数据加载失败: ' + err.message
        console.error('C1数据获取失败:', err)
        this.loading = false
      }
    },
    
    // Three.js 初始化
    initThreeJS() {
      console.log('开始初始化Three.js...')
      console.log('loading状态:', this.loading)
      console.log('error状态:', this.error)
      console.log('threejsCanvas元素:', this.$refs.threejsCanvas)
      console.log('threejsContainer元素:', this.$refs.threejsContainer)
      console.log('tunnels数据:', this.tunnels)
      console.log('DOM中所有refs:', Object.keys(this.$refs))
      
      if (!this.$refs.threejsCanvas) {
        console.error('threejsCanvas元素不存在')
        return
      }
      
      if (!this.$refs.threejsContainer) {
        console.error('threejsContainer元素不存在')
        return
      }
      
      if ((!this.tunnels || this.tunnels.length === 0) && (!this.workfaces || this.workfaces.length === 0)) {
        console.warn('没有巷道或工作面数据，跳过Three.js初始化')
        return
      }
      
      // 销毁现有Three.js实例
      this.cleanupThreeJS()
      
      try {
        // 创建场景 - 使用markRaw避免Vue响应式代理
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x0A1931)
        this.scene = markRaw(scene)
        
        // 创建相机 - 使用markRaw避免Vue响应式代理
        const camera = new THREE.PerspectiveCamera(
          75,
          this.$refs.threejsContainer.offsetWidth / this.$refs.threejsContainer.offsetHeight,
          0.1,
          2000
        )
        // 调整相机位置，使其能看到测试立方体和巷道
        camera.position.set(100, 100, 100)
        camera.lookAt(0, 0, 0)  // 先看向原点，确认能看到测试立方体
        this.camera = markRaw(camera)
        
        // 创建渲染器 - 使用markRaw避免Vue响应式代理
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(
          this.$refs.threejsContainer.offsetWidth,
          this.$refs.threejsContainer.offsetHeight
        )
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer = markRaw(renderer)
        
        // 添加到DOM
        this.$refs.threejsCanvas.appendChild(this.renderer.domElement)
        
        // 创建光照
        this.setupLights()
        
        // 添加坐标轴
        const axesHelper = new THREE.AxesHelper(50)
        axesHelper.userData.isAxesHelper = true // 标记为坐标轴
        this.scene.add(axesHelper)
        console.log('坐标轴已添加到场景')
        
        // 添加一个明显的测试立方体来确认渲染
        const testGeometry = new THREE.BoxGeometry(0, 0, 0)
        const testMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        const testCube = new THREE.Mesh(testGeometry, testMaterial)
        testCube.position.set(0, 0, 0)
        testCube.userData.isTestCube = true // 标记为测试立方体
        this.scene.add(testCube)
        console.log('测试立方体已添加到场景')
        
        // 创建轨道控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true // 启用阻尼效果
        this.controls.dampingFactor = 0.05 // 阻尼系数
        this.controls.enableZoom = true // 启用缩放
        this.controls.enablePan = true // 启用平移
        this.controls.enableRotate = true // 启用旋转
        this.controls.autoRotate = false // 禁用自动旋转
        this.controls.autoRotateSpeed = 0.5 // 自动旋转速度
        this.controls.maxPolarAngle = Math.PI // 限制垂直旋转角度
        this.controls.minDistance = 10 // 最小缩放距离
        this.controls.maxDistance = 1000 // 最大缩放距离
        // 键盘与鼠标平移参数与监听
        if (this.controls.listenToKeyEvents) {
          this.controls.listenToKeyEvents(window)
        }
        this.controls.screenSpacePanning = true
        this.controls.panSpeed = 1.0
        this.controls.keyPanSpeed = 50
        
        // 创建射线投射器和鼠标
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()
        
        // 添加事件监听
        this.setupEventListeners()
        
        // 渲染巷道和工作面
        this.renderTunnelsAndWorkfaces()
        
        // 开始渲染循环
        this.animate()
        
        // 场景初始化完成
        console.log('场景中的对象数量:', this.scene.children.length)
        console.log('场景中的所有对象:', this.scene.children.map(child => ({
          type: child.type,
          position: child.position,
          visible: child.visible,
          color: child.material ? child.material.color : 'N/A'
        })))
        
        console.log('Three.js初始化成功')
        
      } catch (error) {
        console.error('Three.js初始化失败:', error)
        return
      }
    },
    
    // 设置光照
    setupLights() {
      // 环境光 - 增强亮度
      const ambientLight = new THREE.AmbientLight(0x404040, 1.0)
      this.scene.add(ambientLight)
      
      // 方向光 - 增强亮度
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
      directionalLight.position.set(100, 100, 50)
      directionalLight.castShadow = true
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      this.scene.add(directionalLight)
    },
    
    // 渲染巷道和工作面
    renderTunnelsAndWorkfaces() {
      console.log('开始渲染巷道和工作面...')
      console.log('scene:', this.scene)
      console.log('tunnels:', this.tunnels)
      console.log('workfaces:', this.workfaces)
      
      if (!this.scene) {
        console.error('Three.js场景未初始化')
        return
      }

      const hasTunnels = this.tunnels && this.tunnels.length > 0
      const hasWorkfaces = this.workfaces && this.workfaces.length > 0
      
      if (!hasTunnels && !hasWorkfaces) {
        console.warn('没有巷道或工作面数据可渲染')
        return
      }

      if (hasTunnels) {
        console.log(`开始渲染 ${this.tunnels.length} 个巷道`)
      }
      if (hasWorkfaces) {
        console.log(`开始渲染 ${this.workfaces.length} 个工作面`)
      }

      // 清除现有巷道和工作面
      this.clearMeshes()

      // 先创建工作面几何体（保证巷道依据已确定的工作面）
      if (hasWorkfaces) {
        this.workfaces.forEach((workface, index) => {
          console.log(`处理工作面 ${index + 1}/${this.workfaces.length}:`, workface.name)
          console.log('工作面数据:', workface)
          
          if (workface.threeD_position && workface.threeD_position.reference_point) {
            console.log(`创建工作面 ${workface.name} 的3D模型`)
            const mesh = this.createWorkfaceMesh(workface, index)
            if (mesh) {
              this.scene.add(mesh)
              // 注意：工作面网格不再加入 tunnelMeshes，避免巷道高亮逻辑影响工作面
              console.log(`工作面 ${workface.name} 3D模型创建成功`)
              // 添加工作面名称标签（位于工作面顶部中心，XOZ平面显示）
              try {
                if (!this.workfaceLabelPositions) this.workfaceLabelPositions = {}
                // 计算工作面顶部中心（对角线中点且位于最大Y的平面）
                const height = workface.coal_seam_thickness || 3.0
                const length = workface.strike_length || 400
                const width = workface.dip_length || 200
                const refPoint = workface.threeD_position?.reference_point || workface.reference_point
                let angleDeg = 0
                if (workface.threeD_position && typeof workface.threeD_position.rotation_angle !== 'undefined') {
                  angleDeg = Number(workface.threeD_position.rotation_angle) || 0
                } else if (typeof workface.rotation_angle !== 'undefined') {
                  angleDeg = Number(workface.rotation_angle) || 0
                }
                const angleRad = THREE.MathUtils.degToRad(-angleDeg)
                const cosA = Math.cos(angleRad)
                const sinA = Math.sin(angleRad)
                const localTopCenter = { x: length / 2, y: height, z: width / 2 }
                const topCenterX = refPoint.x + localTopCenter.x * cosA - localTopCenter.z * sinA
                const topCenterY = refPoint.y + 10
                const topCenterZ = refPoint.z + localTopCenter.x * sinA + localTopCenter.z * cosA

                const label = this.createTextPlane(workface.name || '未命名工作面', '#00E5FF', 64)
                if (label) {
                  // 轻微抬高，避免与模型顶面重合
                  label.position.set(topCenterX, topCenterY + 0.5, topCenterZ)
                  this.scene.add(label)
                  if (!this.labelObjects) this.labelObjects = []
                  this.labelObjects.push(label)
                  this.workfaceLabelPositions[workface.id] = { x: topCenterX, y: topCenterY + 0.5, z: topCenterZ }
                  console.log(`工作面 ${workface.name} 名称标签已添加（顶部中心，XOZ平面），位置: (${topCenterX}, ${topCenterY + 0.5}, ${topCenterZ})`)
                }
              } catch (e) {
                console.warn(`工作面 ${workface.name} 名称标签添加失败:`, e)
              }
            } else {
              console.error(`工作面 ${workface.name} 3D模型创建失败`)
            }
          } else {
            console.warn(`工作面 ${workface.name} 缺少参照点坐标数据`)
          }
        })
        console.log(`工作面渲染完成`)
      }

      // 再创建巷道几何体（基于分段数据）
      if (hasTunnels) {
        this.tunnels.forEach((tunnel, index) => {
          console.log(`处理巷道 ${index + 1}/${this.tunnels.length}:`, tunnel.name)
          console.log('巷道数据:', tunnel)
          
          console.log(`创建巷道 ${tunnel.name} 的3D模型`)
          const segmentMeshes = this.createTunnelMesh(tunnel, index)
          if (segmentMeshes && Array.isArray(segmentMeshes)) {
            // 将每个分段网格添加到场景中
            segmentMeshes.forEach(segmentMesh => {
              this.scene.add(segmentMesh)
              this.tunnelMeshes.push(segmentMesh)
            })
            console.log(`巷道 ${tunnel.name} 3D模型创建成功，包含 ${segmentMeshes.length} 个分段`)
          } else {
            console.error(`巷道 ${tunnel.name} 3D模型创建失败`)
          }
        })
        console.log(`巷道渲染完成，共创建 ${this.tunnelMeshes.length} 个3D模型`)
      }
    },
    
    // 清除巷道和工作面网格
    clearMeshes() {
      console.log('开始清除巷道和工作面网格，当前数量:', this.tunnelMeshes.length)
      
      // 方法1：清除已知的网格
      this.tunnelMeshes.forEach(mesh => {
        this.scene.remove(mesh)
        // 释放几何体和材质资源
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        if (mesh.material) {
          mesh.material.dispose()
        }
      })
      this.tunnelMeshes = []
      
      // 方法2：遍历场景中的所有对象，清除所有巷道和工作面相关的网格
      const objectsToRemove = []
      this.scene.traverse((child) => {
        if (child.isMesh && child.userData && 
            (child.userData.tunnel || child.userData.workface || 
             child.userData.type === 'tunnel_segment' || child.userData.type === 'tunnel_base')) {
          const name = child.userData.tunnel?.name || child.userData.workface?.name || '未知'
          console.log('发现网格需要清除:', name)
          objectsToRemove.push(child)
        }
      })
      
      objectsToRemove.forEach(mesh => {
        this.scene.remove(mesh)
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        if (mesh.material) {
          mesh.material.dispose()
        }
      })
      
      // 方法3：强制清除所有非坐标轴、非光照、非测试立方体的Mesh对象
      const allMeshesToRemove = []
      this.scene.traverse((child) => {
        if (child.isMesh && 
            !child.userData.isTestCube && 
            !child.userData.isAxesHelper &&
            (child.userData.tunnel || child.userData.workface || 
             child.userData.type === 'tunnel_segment' || child.userData.type === 'tunnel_base')) {
          const name = child.userData.tunnel?.name || child.userData.workface?.name || '未知'
          console.log('强制清除网格:', name)
          allMeshesToRemove.push(child)
        }
      })
      
      allMeshesToRemove.forEach(mesh => {
        this.scene.remove(mesh)
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        if (mesh.material) {
          mesh.material.dispose()
        }
      })
      
      console.log('巷道和工作面网格清除完成，清除了', objectsToRemove.length + allMeshesToRemove.length, '个对象')
    },
    
    // 创建巷道网格（基于分段数据）
    createTunnelMesh(tunnel, index) {
      console.log(`开始创建巷道网格: ${tunnel.name}`)
      console.log('巷道完整数据:', tunnel)
      
      try {
        // 检查是否有分段数据
        // 创建网格数组
        const meshes = []
        
        // 首先创建整个巷道的基础模型（半透明）
        const workface = this.workfaces.find(wf => wf.id === tunnel.workface_id)
        if (workface) {
          // 检查工作面是否有参照点数据
          let refPoint = null
          if (workface.threeD_position && workface.threeD_position.reference_point) {
            refPoint = workface.threeD_position.reference_point
          } else if (workface.reference_point) {
            refPoint = workface.reference_point
          }
          
          if (refPoint) {
            const baseMesh = this.createBaseTunnelMesh(tunnel, workface, index)
            if (baseMesh) {
              meshes.push(baseMesh)
            }
            // 添加巷道名称标签与连接线：位置与分段序号一致（巷道中心顶部上方 + 连接线）
            try {
              const labelSprite = this.createTextSprite(tunnel.name || '未命名巷道', '#FFFFFF', 56)
              if (labelSprite) {
                // 连接线起点：巷道中心上方（优先使用 start/end 中点）
                const startPos = tunnel.threeD_position?.start_position
                const endPos = tunnel.threeD_position?.end_position
                let anchorX, anchorY, anchorZ
                if (startPos && endPos && startPos.x !== undefined && endPos.x !== undefined) {
                  anchorX = (startPos.x + endPos.x) / 2
                  anchorY = (startPos.y + endPos.y) / 2
                  anchorZ = (startPos.z + endPos.z) / 2
                } else {
                  const pos = baseMesh ? baseMesh.position : (workface.threeD_position?.reference_point || workface.reference_point || { x: 0, y: 0, z: 0 })
                  anchorX = pos.x; anchorY = pos.y; anchorZ = pos.z
                }
                const height = tunnel.tunnel_height || 3.0
                const anchorTop = new THREE.Vector3(anchorX, anchorY + (height / 2), anchorZ)
                // 标签位置：在中心顶部再上移固定偏移（与分段序号一致为 +6）
                const labelPos = new THREE.Vector3(anchorTop.x, anchorTop.y + 6, anchorTop.z)
                labelSprite.position.set(labelPos.x, labelPos.y, labelPos.z)
                this.scene.add(labelSprite)
                this.tunnelMeshes.push(labelSprite)

                // 连接线
                const connector = this.createConnector(anchorTop, labelPos, 0.15, 0xFFFFFF)
                if (connector) {
                  connector.userData = { type: 'tunnel_name_connector', tunnel }
                  this.scene.add(connector)
                  this.tunnelMeshes.push(connector)
                }

                console.log(`巷道 ${tunnel.name} 名称标签与连接线已添加，标签位置: (${labelPos.x}, ${labelPos.y}, ${labelPos.z})`)
              }
            } catch (e) {
              console.warn(`巷道 ${tunnel.name} 名称标签添加失败:`, e)
            }

            // 基于 cumulative_advance 绘制灰色外壳（比巷道长宽高各大3）
            const shellAdvance = Number(tunnel.cumulative_advance) || 0
            if (shellAdvance > 0) {
              try {
                const shellWidth = (tunnel.tunnel_width || 4.0) + 3
                const shellHeight = (tunnel.tunnel_height || 3.0) + 3
                const shellLength = shellAdvance

                console.log(`巷道 ${tunnel.name} 灰色外壳宽度: ${shellWidth}, 高度: ${shellHeight}, 长度: ${shellLength}， 巷道类型：${tunnel.tunnel_type}`)

                // 计算巷道起点（与基础模型一致）
                const strikeLength = workface.strike_length || 100
                const workfaceWidth = workface.dip_length || 200
                let start = { x: refPoint.x, y: refPoint.y, z: refPoint.z }
                let end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z }
                if (tunnel.tunnel_type === '轨道巷道') {
                  start = { x: refPoint.x, y: refPoint.y, z: refPoint.z }
                  end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z }
                } else if (tunnel.tunnel_type === '运输巷道') {
                  start = { x: refPoint.x, y: refPoint.y, z: refPoint.z + workfaceWidth }
                  end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z + workfaceWidth }
                } else {
                  const zOffset = (index % 2 === 0) ? 0 : workfaceWidth
                  start = { x: refPoint.x, y: refPoint.y, z: refPoint.z + zOffset }
                  end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z + zOffset }
                }

                // 应用工作面旋转（与基础模型一致）
                let angleDeg = 0
                if (workface.threeD_position && typeof workface.threeD_position.rotation_angle !== 'undefined') {
                  angleDeg = Number(workface.threeD_position.rotation_angle) || 0
                } else if (typeof workface.rotation_angle !== 'undefined') {
                  angleDeg = Number(workface.rotation_angle) || 0
                }
                const angleRad = THREE.MathUtils.degToRad(-angleDeg)
                const cosA = Math.cos(angleRad)
                const sinA = Math.sin(angleRad)
                const rotatePoint = (p) => ({
                  x: refPoint.x + (p.x - refPoint.x) * cosA - (p.z - refPoint.z) * sinA,
                  y: p.y,
                  z: refPoint.z + (p.x - refPoint.x) * sinA + (p.z - refPoint.z) * cosA
                })
                const startRot = rotatePoint(start)
                const endRot = rotatePoint(end)

                // 方向向量（巷道沿向）
                const direction = new THREE.Vector3(
                  endRot.x - startRot.x,
                  endRot.y - startRot.y,
                  endRot.z - startRot.z
                ).normalize()

                // 创建外壳几何体和材质
                const shellGeometry = new THREE.BoxGeometry(shellWidth, shellHeight, shellLength)
                const shellMaterial = new THREE.MeshLambertMaterial({
                  color: 0x999999, // 灰色
                  transparent: true,
                  opacity: 0.75
                })
                const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial)

                // 外壳中心位置：起点沿方向前进 shellLength/2
                const centerX = startRot.x + direction.x * (shellLength / 2)
                const centerY = startRot.y + direction.y * (shellLength / 2)
                const centerZ = startRot.z + direction.z * (shellLength / 2)
                shellMesh.position.set(centerX, centerY, centerZ)

                // 旋转与基础模型一致
                const yaw = Math.atan2(direction.x, direction.z)
                shellMesh.rotation.y = yaw

                shellMesh.userData = { tunnel: tunnel, type: 'advance_shell' }
                meshes.push(shellMesh)

                // 在灰色外壳末端添加当前进尺（cumulative_advance）标签与连接线
                try {
                  const advanceValue = shellAdvance
                  const labelText = `${advanceValue}m`
                  const labelSprite = this.createTextSprite(labelText, '#FFFFFF', 48)
                  if (labelSprite) {
                    // 计算外壳末端顶部位置：startRot + direction * shellLength，再上移半高
                    const endX = startRot.x + direction.x * shellLength
                    const endY = startRot.y + (direction.y || 0) * shellLength
                    const endZ = startRot.z + direction.z * shellLength
                    const endTop = new THREE.Vector3(endX, endY + shellHeight / 2, endZ)
                    // 标签位置：在末端顶部再上移固定偏移 +6
                    const labelPos = new THREE.Vector3(endTop.x, endTop.y + 6, endTop.z)
                    labelSprite.position.set(labelPos.x, labelPos.y, labelPos.z)
                    labelSprite.userData = { type: 'advance_shell_label', tunnel }
                    this.scene.add(labelSprite)
                    this.tunnelMeshes.push(labelSprite)

                    // 连接线：从外壳末端顶部到标签位置
                    
                    const connector = this.createConnector(endTop, labelPos, 0.15, 0xFFFFFF)
                    if (connector) {
                      connector.userData = { type: 'advance_shell_connector', tunnel }
                      this.scene.add(connector)
                      this.tunnelMeshes.push(connector)
                    }
                    console.log(`巷道 ${tunnel.name} 进尺标签与连接线已添加，值: ${labelText}，位置: (${labelPos.x}, ${labelPos.y}, ${labelPos.z})`)
                  }
                } catch (e) {
                  console.warn(`巷道 ${tunnel.name} 进尺标签添加失败:`, e)
                }
              } catch (e) {
                console.warn(`绘制巷道 ${tunnel.name} 外壳失败:`, e)
              }
            } else {
              console.warn(`巷道 ${tunnel.name} 累计进尺为 ${shellAdvance}，未绘制灰色外壳。类型: ${tunnel.tunnel_type}`)
            }
          }
        }
        
        // 如果有分段数据，创建分段模型
        if (tunnel.segments && tunnel.segments.length > 0) {
          console.log(`巷道 ${tunnel.name} 有 ${tunnel.segments.length} 个分段，创建分段模型`)
        } else {
          console.warn(`巷道 ${tunnel.name} 没有分段数据，仅创建基础模型`)
          return meshes
        }
        
        // 获取巷道尺寸信息
        const tunnelHeight = tunnel.tunnel_height || 3.0
        const tunnelWidth = tunnel.tunnel_width || 4.0
        
        console.log(`创建巷道 ${tunnel.name}: 高度=${tunnelHeight}m, 宽度=${tunnelWidth}m, 统一使用矩形（长方体）建模`)
        console.log(`分段数量: ${tunnel.segments.length}`)
        
        // 创建分段网格数组
        const segmentMeshes = []
        
        // 为每个分段创建独立的网格
        tunnel.segments.forEach((segment, segmentIndex) => {
          try {
            console.log(`创建分段 ${segment.segment_number}:`, segment)
            
            // 获取分段的起始和结束位置
            const startPos = segment.start_position
            const endPos = segment.end_position
            
            if (!startPos || endPos === null || endPos === undefined) {
              console.warn(`分段 ${segment.segment_number} 缺少位置数据`)
              return
            }
            
            // 计算分段长度
            let segmentLength
            if (typeof endPos === 'object' && endPos.x !== undefined) {
              // end_position是坐标对象
              segmentLength = Math.sqrt(
                Math.pow(endPos.x - startPos.x, 2) +
                Math.pow(endPos.y - startPos.y, 2) +
                Math.pow(endPos.z - startPos.z, 2)
              )
            } else {
              // end_position是长度数值
              const startOffset = typeof startPos === 'number' ? parseFloat(startPos) : 0
              segmentLength = parseFloat(endPos) - startOffset
              if (segmentLength <= 0) {
                console.warn(`Invalid segment length ${segmentLength} for segment ${segment_number}`)
                return
              }
            }
            
            console.log(`分段 ${segment.segment_number} 长度: ${segmentLength}m`)
            
            // 创建分段几何体 - 全部使用长方体（矩形），不区分形状
            const geometry = new THREE.BoxGeometry(tunnelWidth, tunnelHeight, segmentLength)
            
            // 解析颜色代码
            let color = 0x808080 // 默认灰色
            if (segment.color_code) {
              try {
                // 如果是十六进制颜色代码
                if (segment.color_code.startsWith('#')) {
                  color = parseInt(segment.color_code.substring(1), 16)
                } else {
                  color = parseInt(segment.color_code, 16)
                }
              } catch (e) {
                console.warn(`分段 ${segment.segment_number} 颜色代码解析失败: ${segment.color_code}`)
              }
            }
            
            // 创建材质
            const material = new THREE.MeshLambertMaterial({
              color: color,
              transparent: true,
              opacity: 0.9
            })
            
            // 创建网格
            const mesh = new THREE.Mesh(geometry, material)
            
            // 计算分段中心位置和方向
            let centerX, centerY, centerZ, direction
            
            if (typeof endPos === 'object' && endPos.x !== undefined) {
              // end_position是坐标对象（相对于工作面参照点坐标系），应用工作面的旋转角
              let angleDegForSeg = 0
              let refPointForSeg = null
              if (workface && workface.threeD_position && workface.threeD_position.reference_point) {
                refPointForSeg = workface.threeD_position.reference_point
                if (typeof workface.threeD_position.rotation_angle !== 'undefined') {
                  angleDegForSeg = Number(workface.threeD_position.rotation_angle) || 0
                }
              } else if (workface && workface.reference_point) {
                refPointForSeg = workface.reference_point
                if (typeof workface.rotation_angle !== 'undefined') {
                  angleDegForSeg = Number(workface.rotation_angle) || 0
                }
              }
              const angleRadForSeg = THREE.MathUtils.degToRad(-angleDegForSeg)
              const cosS = Math.cos(angleRadForSeg)
              const sinS = Math.sin(angleRadForSeg)
              const rotatePointSeg = (p) => ({
                x: refPointForSeg ? (refPointForSeg.x + (p.x - refPointForSeg.x) * cosS - (p.z - refPointForSeg.z) * sinS) : p.x,
                y: p.y,
                z: refPointForSeg ? (refPointForSeg.z + (p.x - refPointForSeg.x) * sinS + (p.z - refPointForSeg.z) * cosS) : p.z
              })
              const startRot = rotatePointSeg(startPos)
              const endRot = rotatePointSeg(endPos)
              
              centerX = (startRot.x + endRot.x) / 2
              centerY = (startRot.y + endRot.y) / 2
              centerZ = (startRot.z + endRot.z) / 2
              
              direction = new THREE.Vector3(
                endRot.x - startRot.x,
                endRot.y - startRot.y,
                endRot.z - startRot.z
              ).normalize()
            } else {
              // end_position是长度数值，需要基于巷道位置计算分段位置
              console.log(`巷道 ${tunnel.name} 分段定位 - end_position是长度: ${endPos}`)
              
              // 查找巷道对应的工作面
              let workface = null
              if (tunnel.workface_id) {
                workface = this.workfaces.find(wf => wf.id === tunnel.workface_id)
              }
              
              if (!workface) {
                console.warn(`未找到巷道 ${tunnel.name} 对应的工作面`)
                return
              }
              
              // 获取工作面参照点
              let refPoint = null
              if (workface.threeD_position && workface.threeD_position.reference_point) {
                refPoint = workface.threeD_position.reference_point
              } else if (workface.reference_point) {
                refPoint = workface.reference_point
              }
              
              if (!refPoint) {
                console.warn(`工作面 ${workface.name} 没有参照点数据`)
                return
              }
              
              console.log(`工作面参照点: (${refPoint.x}, ${refPoint.y}, ${refPoint.z}), 巷道类型: ${tunnel.tunnel_type}`)
              
              // 根据巷道类型确定巷道起始位置
              let tunnelStartX, tunnelStartY, tunnelStartZ
              const strikeLength = workface.strike_length || 100
              const workfaceWidth = workface.dip_length || 200
              
              if (tunnel.tunnel_type === '轨道巷') {
                tunnelStartX = refPoint.x
                tunnelStartY = refPoint.y
                tunnelStartZ = refPoint.z
              } else if (tunnel.tunnel_type === '运输巷') {
                tunnelStartX = refPoint.x
                tunnelStartY = refPoint.y
                tunnelStartZ = refPoint.z + workfaceWidth
              } else {
                // 其他巷道类型，根据巷道索引分配位置
                const tunnelIndex = this.tunnels.findIndex(t => t.id === tunnel.id)
                const zOffset = (tunnelIndex % 2 === 0) ? 0 : workfaceWidth
                tunnelStartX = refPoint.x
                tunnelStartY = refPoint.y
                tunnelStartZ = refPoint.z + zOffset
              }
              
              console.log(`巷道起始位置: (${tunnelStartX}, ${tunnelStartY}, ${tunnelStartZ})`)
              
              // 分段位置基于巷道起始位置 + 分段起始位置 + 分段长度的一半
              // 应用工作面旋转角到分段中心位置
              let angleDeg = 0
              if (workface.threeD_position && typeof workface.threeD_position.rotation_angle !== 'undefined') {
                angleDeg = Number(workface.threeD_position.rotation_angle) || 0
              } else if (typeof workface.rotation_angle !== 'undefined') {
                angleDeg = Number(workface.rotation_angle) || 0
              }
              const angleRad = THREE.MathUtils.degToRad(-angleDeg)
              const cosA = Math.cos(angleRad)
              const sinA = Math.sin(angleRad)

              let localX, localY, localZ;
              if (typeof startPos === 'number') {
                localX = startPos + segmentLength / 2;
                localY = 0;
                localZ = 0;
              } else {
                localX = (startPos.x || 0) + segmentLength / 2;
                localY = startPos.y || 0;
                localZ = startPos.z || 0;
              }
              const dx = (tunnelStartX - refPoint.x) + localX
              const dz = (tunnelStartZ - refPoint.z) + localZ
              centerX = refPoint.x + dx * cosA - dz * sinA
              centerY = tunnelStartY + localY
              centerZ = refPoint.z + dx * sinA + dz * cosA
              
              let startPosLog = typeof startPos === 'number' ? startPos : `(${startPos.x}, ${startPos.y}, ${startPos.z})`;
              console.log(`分段起始位置: ${startPosLog}`)
              console.log(`分段长度: ${segmentLength}m`)
              console.log(`最终分段位置(已应用旋转): (${centerX}, ${centerY}, ${centerZ})`)
              
              // 分段方向为沿X轴并应用工作面旋转后的方向
              direction = new THREE.Vector3(Math.cos(angleRad), 0, Math.sin(angleRad))
            }
            
            mesh.position.set(centerX, centerY, centerZ)
            
            // 计算旋转角度（绕Y轴）
            const angle = Math.atan2(direction.x, direction.z)
            mesh.rotation.y = angle
            
            // 添加用户数据
            mesh.userData = { 
              tunnel: tunnel, 
              segment: segment,
              type: 'tunnel_segment' 
            }
            
            segmentMeshes.push(mesh)

            console.log(`分段 ${segment.segment_number} 网格创建完成，位置: (${centerX}, ${centerY}, ${centerZ}), 颜色: #${color.toString(16)}`)
            // 添加分段序号标签与连接线（标签位于分段上方）
            try {
              const labelText = String(segment.segment_number)
              const labelSprite = this.createTextSprite(labelText, '#FFFFFF', 48)
              if (labelSprite) {
                const labelPos = { x: centerX, y: centerY + (tunnelHeight / 2) + 6, z: centerZ }
                labelSprite.position.set(labelPos.x, labelPos.y, labelPos.z)
                this.scene.add(labelSprite)
                this.tunnelMeshes.push(labelSprite)
                // 连接线：从分段中心指向标签位置
                const connector = this.createConnector(new THREE.Vector3(centerX, centerY, centerZ), new THREE.Vector3(labelPos.x, labelPos.y, labelPos.z), 0.15, 0xFFFFFF)
                if (connector) {
                  this.scene.add(connector)
                  this.tunnelMeshes.push(connector)
                }
                console.log(`分段 ${segment.segment_number} 标签与连接线已添加，标签位置: (${labelPos.x}, ${labelPos.y}, ${labelPos.z})`)
              }
            } catch (e) {
              console.warn(`分段 ${segment.segment_number} 标签添加失败:`, e)
            }
            
          } catch (error) {
            console.error(`创建分段 ${segment.segment_number} 网格失败:`, error)
          }
        })
        
        // 将分段网格添加到总网格数组中
        meshes.push(...segmentMeshes)
        
        console.log(`巷道 ${tunnel.name} 所有网格创建完成，共 ${meshes.length} 个网格（包含基础模型和 ${segmentMeshes.length} 个分段）`)
        return meshes
        
      } catch (error) {
        console.error(`创建巷道 ${tunnel.name} 网格失败:`, error)
        return null
      }
    },

    // 创建文字精灵（Canvas渲染），用于名称/序号标签
    createTextSprite(text, color = '#FFFFFF', fontSize = 64) {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const padding = 16
        ctx.font = `${fontSize}px sans-serif`
        const metrics = ctx.measureText(text)
        const textWidth = Math.ceil(metrics.width) + padding * 2
        const textHeight = fontSize + padding * 2
        canvas.width = textWidth
        canvas.height = textHeight
        // 背景（透明）
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        // 文本描边 + 填充
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = color
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 3
        ctx.strokeText(text, padding, padding)
        ctx.fillText(text, padding, padding)

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
        const sprite = new THREE.Sprite(material)
        // 根据像素尺寸设置合理的三维缩放
        const scaleX = Math.max(8, textWidth / 10)
        const scaleY = Math.max(3, textHeight / 10)
        sprite.scale.set(scaleX, scaleY, 1)
        return sprite
      } catch (e) {
        console.warn('创建文字精灵失败:', e)
        return null
      }
    },

    // 创建文字平面（Canvas渲染为纹理，旋转至XOZ平面）
    createTextPlane(text, color = '#FFFFFF', fontSize = 64) {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        const padding = 16
        ctx.font = `${fontSize}px sans-serif`
        const metrics = ctx.measureText(text)
        const textWidth = Math.ceil(metrics.width) + padding * 2
        const textHeight = fontSize + padding * 2
        canvas.width = textWidth
        canvas.height = textHeight
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = color
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.lineWidth = 3
        ctx.strokeText(text, padding, padding)
        ctx.fillText(text, padding, padding)

        const texture = new THREE.CanvasTexture(canvas)
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide })
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
        // 根据像素尺寸设置合理的三维缩放（X对应文本宽度，Z对应文本高度）
        const scaleX = Math.max(8, textWidth / 10)
        const scaleY = Math.max(3, textHeight / 10)
        // 注意：平面原始尺寸为 X-Y，在旋转到XOZ后，原来的Y尺寸对应世界坐标的Z方向显示高度，因此这里设置Y缩放为文本高度
        plane.scale.set(scaleX, scaleY, 1)
        // 旋转到XOZ平面（法向量指向+Y）
        plane.rotation.x = -Math.PI / 2
        return plane
      } catch (e) {
        console.warn('创建文字平面失败:', e)
        return null
      }
    },

    // 创建细长方体作为连接线，从起点到终点
    createConnector(startVec3, endVec3, thickness = 0.1, color = 0xFFFFFF) {
      try {
        const dir = new THREE.Vector3().subVectors(endVec3, startVec3)
        const len = dir.length()
        if (len <= 0.0001) return null
        dir.normalize()
        const geometry = new THREE.BoxGeometry(thickness, thickness, len)
        const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 })
        const connector = new THREE.Mesh(geometry, material)
        // 设置位置为中点
        const mid = new THREE.Vector3().addVectors(startVec3, endVec3).multiplyScalar(0.5)
        connector.position.set(mid.x, mid.y, mid.z)
        // 旋转使其沿着 dir 指向（以 Z 轴为默认方向）
        const quat = new THREE.Quaternion()
        quat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
        connector.setRotationFromQuaternion(quat)
        return connector
      } catch (e) {
        console.warn('创建连接线失败:', e)
        return null
      }
    },
    
    // 创建巷道基础模型（整个巷道的轮廓）
    createBaseTunnelMesh(tunnel, workface, index) {
      try {
        console.log(`创建巷道 ${tunnel.name} 的基础模型`)
        
        // 检查工作面是否有参照点数据
        let refPoint = null
        if (workface.threeD_position && workface.threeD_position.reference_point) {
          refPoint = workface.threeD_position.reference_point
        } else if (workface.reference_point) {
          refPoint = workface.reference_point
        }
        
        if (!refPoint) {
          console.error('工作面参照点数据不完整')
          return null
        }
        
        // 获取巷道和工作面尺寸
        const tunnelHeight = tunnel.tunnel_height || 3.0
        const tunnelWidth = tunnel.tunnel_width || 4.0
        const strikeLength = workface.strike_length || 100 // 使用strike_length字段作为工作面长度
        const workfaceWidth = workface.dip_length || 200 // 使用dip_length字段作为工作面宽度
        
        console.log(`巷道尺寸: 高度=${tunnelHeight}m, 宽度=${tunnelWidth}m`)
        console.log(`工作面尺寸: 长度=${strikeLength}m, 宽度=${workfaceWidth}m`)
        
        // 计算巷道起始和结束位置（沿X轴绘制，稍后应用工作面旋转）
        let start, end
        
        if (tunnel.tunnel_type === '轨道巷') {
          // 轨道巷：从参照点开始，沿X轴正方向绘制
          start = { x: refPoint.x, y: refPoint.y, z: refPoint.z }
          end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z }
        } else if (tunnel.tunnel_type === '运输巷') {
          // 运输巷：在Z轴偏移工作面宽度后，沿X轴正方向绘制
          start = { x: refPoint.x, y: refPoint.y, z: refPoint.z + workfaceWidth }
          end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z + workfaceWidth }
        } else {
          // 其他巷道：交替分配Z轴偏移
          const zOffset = (index % 2 === 0) ? 0 : workfaceWidth
          start = { x: refPoint.x, y: refPoint.y, z: refPoint.z + zOffset }
          end = { x: refPoint.x + strikeLength, y: refPoint.y, z: refPoint.z + zOffset }
        }
        
        // 应用工作面的旋转角度（绕Y轴）
        let angleDeg = 0
        if (workface.threeD_position && typeof workface.threeD_position.rotation_angle !== 'undefined') {
          angleDeg = Number(workface.threeD_position.rotation_angle) || 0
        } else if (typeof workface.rotation_angle !== 'undefined') {
          angleDeg = Number(workface.rotation_angle) || 0
        }
        const angleRad = THREE.MathUtils.degToRad(-angleDeg)
        const cosA = Math.cos(angleRad)
        const sinA = Math.sin(angleRad)
        const rotatePoint = (p) => ({
          x: refPoint.x + (p.x - refPoint.x) * cosA - (p.z - refPoint.z) * sinA,
          y: p.y,
          z: refPoint.z + (p.x - refPoint.x) * sinA + (p.z - refPoint.z) * cosA
        })
        const startRot = rotatePoint(start)
        const endRot = rotatePoint(end)

        // 计算巷道长度和中心位置（已应用旋转）
        const tunnelLength = Math.sqrt(
          Math.pow(endRot.x - startRot.x, 2) +
          Math.pow(endRot.y - startRot.y, 2) +
          Math.pow(endRot.z - startRot.z, 2)
        )
        
        const centerX = (startRot.x + endRot.x) / 2
        const centerY = (startRot.y + endRot.y) / 2
        const centerZ = (startRot.z + endRot.z) / 2
        
        console.log(`巷道位置(已应用旋转): 起始(${startRot.x}, ${startRot.y}, ${startRot.z}) -> 结束(${endRot.x}, ${endRot.y}, ${endRot.z})`)
        console.log(`巷道中心(已应用旋转): (${centerX}, ${centerY}, ${centerZ}), 长度: ${tunnelLength}m`)
        
        // 创建几何体
        // 减去1，避免与分段网格重叠
        const geometry = new THREE.BoxGeometry(tunnelWidth - 1, tunnelHeight - 1, tunnelLength - 1)
        
        // 创建半透明材质
        const material = new THREE.MeshLambertMaterial({
          color: 0x808080,  // 灰色
          transparent: true,
          opacity: 0.3  // 半透明
        })
        
        // 创建网格
        const mesh = new THREE.Mesh(geometry, material)
        
        // 设置位置
        mesh.position.set(centerX, centerY, centerZ)
        
        // 计算旋转（沿X轴方向，使用旋转后的起止点）
        const direction = new THREE.Vector3(
          endRot.x - startRot.x,
          endRot.y - startRot.y,
          endRot.z - startRot.z
        ).normalize()
        
        const angle = Math.atan2(direction.x, direction.z)
        mesh.rotation.y = angle
        
        // 添加用户数据
        mesh.userData = { 
          tunnel: tunnel, 
          type: 'tunnel_base' 
        }
        
        console.log(`巷道 ${tunnel.name} 基础模型创建完成`)
        return mesh
        
      } catch (error) {
        console.error(`创建巷道 ${tunnel.name} 基础模型失败:`, error)
        return null
      }
    },
    
    // 创建工作面网格
    createWorkfaceMesh(workface, index) {
      console.log(`开始创建工作面网格: ${workface.name}`)
      console.log('工作面完整数据:', workface)
      
      try {
        // 检查工作面是否有参照点数据
        let refPoint = null
        if (workface.threeD_position && workface.threeD_position.reference_point) {
          refPoint = workface.threeD_position.reference_point
        } else if (workface.reference_point) {
          refPoint = workface.reference_point
        }
        
        if (!refPoint) {
          console.error('工作面参照点坐标数据不完整:', workface)
          return null
        }
        
        console.log('参照点位置:', refPoint)
        
        // 创建工作面几何体 - 使用工作面实际尺寸
        // 高度：沿Y轴正方向，使用煤层厚度
        // 长度：沿X轴正方向，使用strike_length字段  
        // 宽度：沿Z轴正方向，使用dip_length字段
        const height = workface.coal_seam_thickness || 3.0 // 煤层厚度作为高度
        const length = workface.strike_length || 400 // 工作面长度使用strike_length字段
        const width = workface.dip_length || 200 // 工作面宽度使用dip_length字段
        const reserved_length =  200 // 预留长度
        
        console.log(`工作面尺寸: 长度=${length}m, 高度=${height}m, 宽度=${width}m`)

        console.log('工作面数据字段:', {
          coal_seam_thickness: workface.coal_seam_thickness,
          strike_length: workface.strike_length,
          dip_length: workface.dip_length,
          reference_point: refPoint
        })
        
        const geometry = new THREE.BoxGeometry(length, height, width)
        // 将局部坐标的原点设置到工作面一个角（固定点），以便绕参照点旋转
        geometry.translate(length / 2, height / 2, width / 2)
        
        console.log('工作面几何体创建成功:', geometry)
        
        // 创建材质 - 使用蓝色区分工作面
        const material = new THREE.MeshLambertMaterial({
          color: 0x1890FF,  // 蓝色
          transparent: true,
          opacity: 0.8
        })
        
        console.log('工作面材质创建成功:', material)
        
        // 创建网格
        const mesh = new THREE.Mesh(geometry, material)
        console.log('工作面网格创建成功:', mesh)
        
        // 读取旋转角度（度），默认0
        let angleDeg = 0
        if (workface.threeD_position && typeof workface.threeD_position.rotation_angle !== 'undefined') {
          angleDeg = Number(workface.threeD_position.rotation_angle) || 0
        } else if (typeof workface.rotation_angle !== 'undefined') {
          angleDeg = Number(workface.rotation_angle) || 0
        }
        const angleRad = THREE.MathUtils.degToRad(angleDeg)
        
        // 将网格原点（选择的角点）放在参照点位置，旋转时保持该点不变
        mesh.position.set(refPoint.x, refPoint.y, refPoint.z)
        
        // 应用旋转
        mesh.rotation.y = angleRad
        
        console.log('工作面最终位置与旋转（绕参照点旋转）:', { anchor: refPoint, position: mesh.position, rotationY_deg: angleDeg })
        
        // 添加用户数据
        mesh.userData = { workface: workface, type: 'workface' }

        // 在参照点位置绘制一个小球体标记，便于核对参照点
        if (refPoint) {
          const markerGeometry = new THREE.SphereGeometry(3, 16, 16)
          const markerMaterial = new THREE.MeshStandardMaterial({ color: 0xFF3B30 })
          const marker = new THREE.Mesh(markerGeometry, markerMaterial)
          marker.position.set(refPoint.x, refPoint.y, refPoint.z)
          marker.userData = { type: 'reference_point_marker', workfaceId: workface.id }
          this.scene.add(marker)
          this.tunnelMeshes.push(marker)
        }
        
        console.log(`工作面 ${workface.name} 网格创建完成`)
        return mesh
      } catch (error) {
        console.error(`创建工作面 ${workface.name} 网格失败:`, error)
        return null
      }
    },
    
    // 获取巷道颜色
    getTunnelColor(index) {
      const colors = [
        0x00E5FF, // 青色
        0x52C41A, // 绿色
        0x1890FF, // 蓝色
        0xFA8C16, // 橙色
        0xEB2F96, // 粉色
        0x722ED1, // 紫色
        0x13C2C2, // 青绿色
        0xFAAD14  // 金色
      ]
      return colors[index % colors.length]
    },
    
    // 设置事件监听
    setupEventListeners() {
      this.$refs.threejsCanvas.addEventListener('click', this.onCanvasClick)
      // 根据缩放动态调整平移速度
      this.$refs.threejsCanvas.addEventListener('wheel', this.onCanvasWheel, { passive: true })
      window.addEventListener('resize', this.onWindowResize)
    },

    // 鼠标滚轮：依据相机与目标距离自适应平移速度（越近平移越快）
    onCanvasWheel() {
      if (!this.camera || !this.controls) return
      try {
        const dist = this.camera.position.distanceTo(this.controls.target)
        // 映射距离到速度范围 [0.8, 4.0]
        const speed = Math.min(4.0, Math.max(0.8, 300 / Math.max(dist, 1)))
        this.controls.panSpeed = speed
        // 键盘平移也同步提高
        this.controls.keyPanSpeed = Math.min(200, Math.max(20, speed * 40))
      } catch (e) {
        // 忽略异常
      }
    },
    
    // 画布点击事件
    onCanvasClick(event) {
      if (!this.raycaster || !this.camera) return
      
      const rect = this.$refs.threejsCanvas.getBoundingClientRect()
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      this.raycaster.setFromCamera(this.mouse, this.camera)
      // 使用去代理后的原始 Three 对象进行射线检测，避免 Vue Proxy 与 Three 的只读属性冲突
      const raycaster = toRaw(this.raycaster) || this.raycaster
      // 生成去代理后的目标对象列表
      const targets = this.getRaycastTargets()
      const intersects = raycaster.intersectObjects(targets, false)
      
      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object
        if (clickedMesh.userData.tunnel) {
          this.selectTunnel(clickedMesh.userData.tunnel)
        }
      }
    },

    // 返回供射线检测使用的去代理对象列表
    getRaycastTargets() {
      try {
        const meshes = Array.isArray(this.tunnelMeshes) ? this.tunnelMeshes : []
        // 尽量取到 Three 原始对象，避免 Proxy 干扰只读属性访问
        return meshes.map(obj => {
          try {
            return obj && obj.isObject3D ? toRaw(obj) : obj
          } catch (e) {
            return obj
          }
        })
      } catch (e) {
        return []
      }
    },
    
    // 选择巷道
    selectTunnel(tunnel) {
      this.selectedTunnel = tunnel
      this.selectedWorkface = null
      
      // 定位相机到巷道位置
      this.focusOnTunnel(tunnel)
      
      // 高亮选中的巷道
      this.highlightSelectedTunnel()

      // 仅高亮该巷道所属的工作面
      this.highlightWorkfaceForTunnel(tunnel)
      
      // 打开坐标编辑弹窗
      this.openCoordinateModal()
    },
    
    // 选择工作面
    selectWorkface(workface) {
      this.selectedWorkface = workface
      this.selectedTunnel = null
      
      // 定位相机到工作面位置
      this.focusOnWorkface(workface)
      
      // 高亮选中的工作面
      this.highlightSelectedWorkface()
      
      // 打开坐标编辑弹窗
      this.openCoordinateModal()
    },
    
    // 定位相机到巷道位置
    focusOnTunnel(tunnel) {
      if (!this.camera || !tunnel.threeD_position) {
        return
      }
      
      // 计算巷道中心位置
      const startPos = tunnel.threeD_position.start_position
      const endPos = tunnel.threeD_position.end_position
      const centerX = (startPos.x + endPos.x) / 2
      const centerY = (startPos.y + endPos.y) / 2
      const centerZ = (startPos.z + endPos.z) / 2
      
      // 计算巷道长度，用于确定相机距离
      const length = Math.sqrt(
        Math.pow(endPos.x - startPos.x, 2) + 
        Math.pow(endPos.y - startPos.y, 2) + 
        Math.pow(endPos.z - startPos.z, 2)
      )
      
      // 相机距离：巷道长度的2倍
      const distance = Math.max(length * 2, 100)
      
      // 设置相机位置：在巷道中心上方和侧方
      this.camera.position.set(
        centerX + distance * 0.5,
        centerY + distance * 0.3,
        centerZ + distance * 0.5
      )
      
      // 相机看向巷道中心
      this.camera.lookAt(centerX, centerY, centerZ)
      
      // 更新控制器目标
      if (this.controls) {
        this.controls.target.set(centerX, centerY, centerZ)
        this.controls.update()
      }
      
      console.log(`相机定位到巷道 ${tunnel.name}:`, {
        center: { x: centerX, y: centerY, z: centerZ },
        camera: this.camera.position,
        distance: distance
      })
    },
    
    // 定位相机到工作面位置
    focusOnWorkface(workface) {
      if (!this.camera) {
        return
      }
      
      // 检查工作面是否有参照点数据
      let refPoint = null
      if (workface.threeD_position && workface.threeD_position.reference_point) {
        refPoint = workface.threeD_position.reference_point
      } else if (workface.reference_point) {
        refPoint = workface.reference_point
      }
      
      if (!refPoint) {
        console.error('工作面参照点数据不完整')
        return
      }
      
      // 相机距离：固定距离
      const distance = 100
      
      // 设置相机位置：在工作面参照点上方和侧方
      this.camera.position.set(
        refPoint.x + distance * 0.5,
        refPoint.y + distance * 0.3,
        refPoint.z + distance * 0.5
      )
      
      // 相机看向工作面参照点
      this.camera.lookAt(refPoint.x, refPoint.y, refPoint.z)
      
      // 更新控制器目标
      if (this.controls) {
        this.controls.target.set(refPoint.x, refPoint.y, refPoint.z)
        this.controls.update()
      }
      
      console.log(`相机定位到工作面 ${workface.name}:`, {
        reference_point: refPoint,
        camera: this.camera.position,
        distance: distance
      })
    },
    
    // 高亮选中的巷道
    highlightSelectedTunnel() {
      this.tunnelMeshes.forEach(mesh => {
        const isTunnelMesh = !!(mesh.userData && (mesh.userData.tunnel || mesh.userData.type === 'tunnel_segment' || mesh.userData.type === 'tunnel_base'))
        if (!isTunnelMesh) return

        // 缓存原始材质属性（分段颜色、发光、透明度）
        if (!mesh.userData.__originalColorHex) {
          try { mesh.userData.__originalColorHex = mesh.material.color.getHex() } catch (e) {}
        }
        if (!mesh.userData.__originalEmissiveHex && mesh.material.emissive) {
          try { mesh.userData.__originalEmissiveHex = mesh.material.emissive.getHex() } catch (e) {}
        }
        if (mesh.userData.__originalOpacity === undefined) {
          mesh.userData.__originalOpacity = mesh.material.opacity
        }

        const isSelected = !!(mesh.userData.tunnel && mesh.userData.tunnel.id === this.selectedTunnel?.id)
        if (isSelected) {
          // 高亮选中巷道 - 使用白色高亮
          try { mesh.material.color.setHex(0xFFFFFF) } catch (e) {}
          if (mesh.material.emissive) {
            try { mesh.material.emissive.setHex(0x222222) } catch (e) {}
          }
          mesh.material.opacity = 1.0
        } 
        else {
          // 恢复到原始的巷道颜色与属性（支持分段颜色）
          try {
            if (mesh.userData.__originalColorHex !== undefined) {
              mesh.material.color.setHex(mesh.userData.__originalColorHex)
            }
            if (mesh.material.emissive && mesh.userData.__originalEmissiveHex !== undefined) {
              mesh.material.emissive.setHex(mesh.userData.__originalEmissiveHex)
            }
            if (mesh.userData.__originalOpacity !== undefined) {
              mesh.material.opacity = mesh.userData.__originalOpacity
            }
          } catch (e) {
            // 忽略无法设回的材质
          }
        }
      })
    },
    
    // 仅高亮所属巷道的工作面
    highlightWorkfaceForTunnel(tunnel) {
      if (!tunnel) return
      const ownerWorkfaceId = tunnel.workface_id
      this.scene.traverse((child) => {
        if (child.isMesh && child.userData && child.userData.type === 'workface' && child.userData.workface) {
          const isOwner = child.userData.workface.id === ownerWorkfaceId
          // 所属工作面置为绿色，其它恢复为蓝色
          const targetColor = isOwner ? 0x52C41A : 0x1890FF
          try {
            child.material.color.setHex(targetColor)
            child.material.emissive && child.material.emissive.setHex(0x000000)
            child.material.opacity = isOwner ? 0.9 : 0.8
          } catch (e) {
            // 忽略非标准材质
          }
        }
      })
    },

    // 高亮选中的工作面
    highlightSelectedWorkface() {
      // 这里可以添加工作面高亮逻辑
      // 目前暂时只打印日志
      if (this.selectedWorkface) {
        console.log(`高亮工作面: ${this.selectedWorkface.name}`)
      }
    },
    
    // 打开坐标编辑弹窗
    openCoordinateModal() {
      if (this.selectedTunnel && this.selectedTunnel.threeD_position) {
        this.coordinateForm = {
          start_position: { ...this.selectedTunnel.threeD_position.start_position },
          end_position: { ...this.selectedTunnel.threeD_position.end_position }
        }
        this.showCoordinateModal = true
      } else if (this.selectedWorkface) {
        // 检查工作面是否有参照点数据
        let refPoint = null
        if (this.selectedWorkface.threeD_position && this.selectedWorkface.threeD_position.reference_point) {
          refPoint = this.selectedWorkface.threeD_position.reference_point
        } else if (this.selectedWorkface.reference_point) {
          refPoint = this.selectedWorkface.reference_point
        }
        
        if (refPoint) {
          this.coordinateForm = {
            reference_point: { ...refPoint },
            rotation_angle: (
              this.selectedWorkface?.threeD_position &&
              typeof this.selectedWorkface.threeD_position.rotation_angle !== 'undefined'
            )
              ? this.selectedWorkface.threeD_position.rotation_angle
              : (typeof this.selectedWorkface.rotation_angle !== 'undefined'
                  ? this.selectedWorkface.rotation_angle
                  : 0)
          }
          this.showCoordinateModal = true
        }
      }
    },
    
    // 关闭坐标编辑弹窗
    closeCoordinateModal() {
      this.showCoordinateModal = false
      
      // 重置视角到默认位置
      this.resetCameraView()
    },
    
    // 重置相机到默认视角
    resetCameraView() {
      if (!this.camera) return
      
      // 设置默认相机位置
      this.camera.position.set(100, 100, 100)
      this.camera.lookAt(0, 0, 0)
      
      // 更新控制器目标
      if (this.controls) {
        this.controls.target.set(0, 0, 0)
        this.controls.update()
      }
      
      console.log('相机重置到默认视角')
    },
    
    // 保存坐标
    async saveCoordinates() {
      if (!this.selectedTunnel && !this.selectedWorkface) return
      
      this.saving = true
      try {
        let response
        
        if (this.selectedTunnel) {
          // 保存巷道坐标（Demo：不写后端，仅本地更新）
          response = { data: { status: 'success', message: 'demo' } }
          console.info('[demo] skip PUT tunnel position', this.selectedTunnel.id, this.coordinateForm)
          
          if (response.data.status === 'success') {
            this.$message.success('巷道坐标保存成功')
            
            // 更新选中巷道的坐标数据
            this.selectedTunnel.threeD_position = { ...this.coordinateForm }
            console.log('更新后的巷道坐标:', this.selectedTunnel.threeD_position)
            
            // 先清除场景中的巷道和工作面，再重新渲染
            console.log('开始清除和重新渲染巷道和工作面...')
            this.clearMeshes()
            this.renderTunnelsAndWorkfaces()
            
            // 重新高亮选中巷道
            this.highlightSelectedTunnel()
          }
        } else if (this.selectedWorkface) {
          // 保存工作面参照点坐标（Demo：不写后端）
          response = { data: { status: 'success', message: 'demo' } }
          console.info(
            '[demo] skip POST translate/rotate',
            this.selectedWorkface.id,
            this.coordinateForm,
          )
          
          if (response.data.status === 'success') {
            this.$message.success('工作面参照点坐标保存成功（仅演示）')
          }
          
          const rotateResp = { data: { status: 'success' } }
          if (rotateResp.data.status === 'success') {
            this.$message.success('工作面旋转角度保存成功（仅演示）')
          }
          
          // 更新选中工作面的坐标和角度数据
          if (!this.selectedWorkface.threeD_position) {
            this.selectedWorkface.threeD_position = {}
          }
          this.selectedWorkface.threeD_position.reference_point = { ...this.coordinateForm.reference_point }
          this.selectedWorkface.threeD_position.rotation_angle = this.coordinateForm.rotation_angle
          this.selectedWorkface.rotation_angle = this.coordinateForm.rotation_angle
          console.log('更新后的工作面参照点坐标与旋转角度:', this.coordinateForm)
          
          // 重新拉取数据后再清除并渲染，确保工作面与巷道使用一致的最新角度
          if (typeof this.fetchData === 'function') {
            await this.fetchData()
          }
          this.clearMeshes()
          this.renderTunnelsAndWorkfaces()
          
          // 重新高亮选中工作面
          this.highlightSelectedWorkface()
        }
        
        if (response && response.data.status === 'success') {
          this.closeCoordinateModal()
        } else {
          this.$message.error('保存失败: ' + (response?.data?.message || '未知错误'))
        }
      } catch (error) {
        console.error('保存坐标失败:', error)
        this.$message.error('保存失败: ' + error.message)
      } finally {
        this.saving = false
      }
    },
    
    // 切换侧边栏
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
      
      // 延迟调整3D渲染区域大小，确保DOM更新完成
      this.$nextTick(() => {
        setTimeout(() => {
          this.adjustRendererSize()
        }, 100)
      })
    },
    
    // 调整3D渲染区域大小
    adjustRendererSize() {
      if (!this.renderer || !this.camera || !this.$refs.threejsContainer) {
        console.log('3D组件未初始化，跳过大小调整')
        return
      }
      
      const container = this.$refs.threejsContainer
      const width = container.offsetWidth
      const height = container.offsetHeight
      
      // 检查容器大小是否有效
      if (width <= 0 || height <= 0) {
        console.log('容器大小无效，跳过调整:', width, 'x', height)
        return
      }
      
      console.log('调整渲染区域大小:', width, 'x', height, '侧边栏状态:', this.sidebarCollapsed ? '折叠' : '展开')
      
      try {
        // 更新渲染器大小
        this.renderer.setSize(width, height)
        
        // 更新相机宽高比
        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()
        
        // 更新控制器
        if (this.controls) {
          this.controls.update()
        }
        
        console.log('3D渲染区域已调整完成')
      } catch (error) {
        console.error('调整3D渲染区域大小时出错:', error)
      }
    },
    
    // 窗口大小改变
    onWindowResize() {
      this.adjustRendererSize()
    },
    
    // 动画循环
    animate() {
      if (!this.renderer || !this.scene || !this.camera) {
        return
      }
      
      try {
        // 更新控制器
        if (this.controls) {
          this.controls.update()
        }
        
        this.renderer.render(this.scene, this.camera)
        this.animationId = requestAnimationFrame(this.animate)
        
        // 动画循环正常运行
      } catch (error) {
        console.error('Three.js渲染错误:', error)
        this.cleanupThreeJS()
        return
      }
    },
    
    // 清理Three.js资源
    cleanupThreeJS() {
      // 停止动画循环
      if (this.animationId) {
        cancelAnimationFrame(this.animationId)
        this.animationId = null
      }
      
      // 清理渲染器
      if (this.renderer) {
        this.renderer.dispose()
        this.renderer = null
      }
      
      // 清理场景
      if (this.scene) {
        this.scene.clear()
        this.scene = null
      }
      
      // 清理控制器
      if (this.controls) {
        this.controls.dispose()
        this.controls = null
      }
      
      // 清理相机
      if (this.camera) {
        this.camera = null
      }
      
      // 清理事件监听器
      if (this.$refs.threejsCanvas) {
        this.$refs.threejsCanvas.removeEventListener('click', this.onCanvasClick)
      }
      window.removeEventListener('resize', this.onWindowResize)
      
      // 清理巷道网格
      this.tunnelMeshes = []
    }
  },
  
  beforeUnmount() {
    this.cleanupThreeJS()
  }
}
</script>

<style scoped>
.c1-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading {
  color: #B3D9FF; /* 浅灰蓝文字 */
  font-size: 14px;
}

.error {
  color: #FF3333; /* 警示文字红色 */
  font-size: 14px;
  text-align: center;
}

.content {
  width: 100%;
  height: 100%;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* 左侧侧边栏 */
.sidebar {
  width: 250px;
  background: #173459;
  border-right: 1px solid #224B7C;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar-collapsed {
  width: 50px;
}

.sidebar-header {
  padding: 12px 16px;
  background: linear-gradient(90deg, #224B7C 0%, #173459 100%);
  border-bottom: 1px solid #224B7C;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-title {
  color: #00E5FF;
  font-weight: 600;
  font-size: 14px;
}

.sidebar-toggle {
  background: transparent;
  border: 1px solid #00E5FF;
  color: #00E5FF;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.sidebar-toggle:hover {
  background: #00E5FF;
  color: #0A1931;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.sidebar-controls {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
}

.control-btn {
  width: 100%;
  padding: 8px 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.control-btn:hover {
  background: #0056b3;
}

.control-tips {
  margin-top: 10px;
  padding: 8px;
  background: #1a2a3a;
  border-radius: 4px;
  border: 1px solid #333;
}

.tip-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 11px;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-key {
  color: #00E5FF;
  font-weight: 500;
  min-width: 80px;
}

.tip-desc {
  color: #888;
  text-align: right;
}

/* 巷道树形列表样式 */
.tunnel-tree {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

/* 全屏模式下的树形列表样式 */
.fullscreen-modal .tunnel-tree {
  max-height: 60vh;
  min-height: 400px;
}

/* 全屏模式下的侧边栏样式 */
.fullscreen-modal .sidebar {
  height: 100%;
  min-height: 70vh;
}

.fullscreen-modal .sidebar-content {
  height: calc(100% - 120px);
  overflow-y: auto;
}

/* 全屏模式下的C1面板样式 */
.fullscreen-modal .c1-panel {
  height: 100%;
  min-height: 80vh;
}

.fullscreen-modal .c1-content {
  height: calc(100% - 60px);
}

.tree-node {
  margin: 1px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.tree-node:hover {
  background: rgba(34, 75, 124, 0.2);
}

.tree-node.selected {
  background: rgba(0, 229, 255, 0.15);
  border: 1px solid rgba(0, 229, 255, 0.4);
  box-shadow: 0 0 6px rgba(0, 229, 255, 0.2);
}

.node-content {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  min-height: 32px;
}

.expand-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #00E5FF;
  margin-right: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.expand-icon:hover {
  color: #00BFFF;
  transform: scale(1.1);
}

.expand-icon-placeholder {
  width: 16px;
  height: 16px;
  margin-right: 4px;
}

.node-icon {
  font-size: 14px;
  margin-right: 6px;
  min-width: 16px;
}

.node-name {
  flex: 1;
  font-size: 13px;
  color: #B0C4DE;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tunnel-count {
  font-size: 11px;
  color: #87CEEB;
  margin-left: 4px;
  background: rgba(0, 229, 255, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid rgba(0, 229, 255, 0.2);
}

.children {
  margin-left: 20px;
  border-left: 1px solid rgba(0, 229, 255, 0.1);
  padding-left: 8px;
}

/* 不同层级的样式 */
.tree-node.level-1 .node-name {
  font-weight: 600;
  color: #00E5FF;
  font-size: 14px;
}

.tree-node.level-2 .node-name {
  font-weight: 500;
  color: #87CEEB;
  font-size: 13px;
}

.tree-node.level-3 .node-name {
  color: #B0C4DE;
  font-size: 13px;
}

.tree-node.level-4 .node-name {
  color: #98A8B8;
  font-size: 12px;
}

.tree-node.level-5 .node-name {
  color: #7A8B9A;
  font-size: 12px;
}

.tree-node.level-6 .node-name {
  color: #6B7B8A;
  font-size: 11px;
}

.tree-node.level-7 .node-name {
  color: #5C6B7A;
  font-size: 11px;
}

/* 选中状态的特殊样式 */
.tree-node.selected .node-name {
  color: #FFFFFF !important;
  font-weight: 600;
}

.tree-node.selected .node-icon {
  filter: brightness(1.2);
}

/* Three.js 容器 */
.threejs-container {
  flex: 1;
  position: relative;
  background: #0A1931;
  transition: all 0.3s ease;
}

.threejs-canvas {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 确保3D容器在侧边栏折叠时正确调整大小 */
.content {
  display: flex;
  height: 100%;
  width: 100%;
}

.sidebar {
  flex-shrink: 0;
  transition: width 0.3s ease;
}

.threejs-container {
  flex: 1;
  min-width: 0; /* 确保flex项目可以缩小 */
}

/* 坐标编辑弹窗 */
.coordinate-modal {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 400px;
  background: #173459;
  border: 1px solid #224B7C;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transform: translateY(100%);
  opacity: 0;
  transition: all 0.3s ease;
  z-index: 1000;
}

.coordinate-modal.modal-visible {
  transform: translateY(0);
  opacity: 1;
}

.modal-header {
  padding: 12px 16px;
  background: linear-gradient(90deg, #224B7C 0%, #173459 100%);
  border-bottom: 1px solid #224B7C;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px 8px 0 0;
}

.modal-title {
  color: #00E5FF;
  font-weight: 600;
  font-size: 14px;
}

.modal-close {
  background: transparent;
  border: none;
  color: #00E5FF;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: #00E5FF;
  color: #0A1931;
}

.modal-content {
  padding: 16px;
}

.tunnel-info {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #224B7C;
}

.tunnel-info h4 {
  margin: 0 0 4px 0;
  color: #00E5FF;
  font-size: 16px;
}

.tunnel-info p {
  margin: 0;
  color: #B3D9FF;
  font-size: 12px;
}

.coordinate-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.position-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.position-label {
  color: #00E5FF;
  font-weight: 600;
  font-size: 14px;
}

.position-inputs {
  display: flex;
  gap: 8px;
  align-items: center;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.input-group label {
  color: #B3D9FF;
  font-size: 12px;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #224B7C;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px;
  }
  
  .sidebar-collapsed {
    width: 40px;
  }
  
  .coordinate-modal {
    width: 320px;
    bottom: 10px;
    right: 10px;
  }
  
  .position-inputs {
    flex-wrap: wrap;
  }
}

/* 自定义滚动条样式 - 全局应用 */
.c1-panel ::-webkit-scrollbar,
.c1-panel * ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.c1-panel ::-webkit-scrollbar-track,
.c1-panel * ::-webkit-scrollbar-track {
  background: #1a2a3a;
  border-radius: 4px;
  border: 1px solid #224B7C;
}

.c1-panel ::-webkit-scrollbar-thumb,
.c1-panel * ::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #00E5FF 0%, #0099CC 100%);
  border-radius: 4px;
  border: 1px solid #224B7C;
  transition: all 0.3s ease;
}

.c1-panel ::-webkit-scrollbar-thumb:hover,
.c1-panel * ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #00BFFF 0%, #0077CC 100%);
  box-shadow: 0 0 8px rgba(0, 229, 255, 0.3);
}

.c1-panel ::-webkit-scrollbar-thumb:active,
.c1-panel * ::-webkit-scrollbar-thumb:active {
  background: linear-gradient(135deg, #0099CC 0%, #005599 100%);
}

.c1-panel ::-webkit-scrollbar-corner,
.c1-panel * ::-webkit-scrollbar-corner {
  background: #1a2a3a;
}

/* 侧边栏滚动条特殊样式 */
.sidebar-content ::-webkit-scrollbar {
  width: 6px;
}

.sidebar-content ::-webkit-scrollbar-track {
  background: #0F2A4A;
  border-radius: 3px;
}

.sidebar-content ::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #224B7C 0%, #173459 100%);
  border-radius: 3px;
  border: 1px solid #00E5FF;
}

.sidebar-content ::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #00E5FF 0%, #224B7C 100%);
  box-shadow: 0 0 6px rgba(0, 229, 255, 0.4);
}

/* 巷道树形列表滚动条 */
.tunnel-tree ::-webkit-scrollbar {
  width: 4px;
}

.tunnel-tree ::-webkit-scrollbar-track {
  background: transparent;
}

.tunnel-tree ::-webkit-scrollbar-thumb {
  background: #00E5FF;
  border-radius: 2px;
  opacity: 0.6;
}

.tunnel-tree ::-webkit-scrollbar-thumb:hover {
  opacity: 1;
  background: #00BFFF;
}
</style>
