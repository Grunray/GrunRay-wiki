---
id: post-algo-1
title: 两数之和：哈希思路笔记
slug: two-sum-hint
type: algorithm
tags:
- 哈希
- 数组
summary: 算法博文示例，带独立 schema 字段。
locale: zh
pinned: true
pinned_order: 1
published_at: '2026-03-20T10:00:00'
updated_at: '2026-03-21T08:00:00'
difficulty: easy
oj: LeetCode
problem_id: '1'
series: 题解随记
---

## 思路

用哈希表存储「值 → 下标」，一次遍历即可。

## 复杂度

时间 O(n)，空间 O(n)。