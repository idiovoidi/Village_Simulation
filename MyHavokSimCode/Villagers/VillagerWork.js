export class VillagerWork {
    static assignFarmWork(villager) {
        const farmLocations = this.locations.get('farm') || [];
        if (farmLocations.length === 0) return;

        // Find unoccupied farm plot
        const availablePlot = farmLocations.find(plot => 
            !this.villagers.some(v => 
                v.workTask && 
                v.workTask.type === 'farm' && 
                v.workTask.location === plot
            )
        );

        if (availablePlot) {
            villager.workTask = {
                type: 'farm',
                location: availablePlot,
                state: 'preparing',
                progress: 0,
                cropType: this.getSeasonalCrop()
            };
            villager.destination = availablePlot;
            villager.state = 'moving';
        }
    }

    static updateFarmWork(villager) {
        if (!villager.workTask || villager.workTask.type !== 'farm') return;

        switch (villager.workTask.state) {
            case 'preparing':
                // Tilling soil animation
                villager.workTask.progress += 0.01;
                if (villager.workTask.progress >= 1) {
                    villager.workTask.state = 'planting';
                    villager.workTask.progress = 0;
                }
                break;

            case 'planting':
                // Planting seeds animation
                villager.workTask.progress += 0.02;
                if (villager.workTask.progress >= 1) {
                    villager.workTask.state = 'tending';
                    villager.workTask.progress = 0;
                }
                break;

            case 'tending':
                // Watering/caring for crops
                villager.workTask.progress += 0.005;
                if (villager.workTask.progress >= 1) {
                    villager.workTask.state = 'harvesting';
                    villager.workTask.progress = 0;
                }
                break;

            case 'harvesting':
                // Harvesting animation
                villager.workTask.progress += 0.015;
                if (villager.workTask.progress >= 1) {
                    // Complete harvest and start new cycle
                    this.completeFarmCycle(villager);
                }
                break;
        }
    }

    static assignGuardWork(villager) {
        const guardPosts = this.locations.get('guard_post') || [];
        if (guardPosts.length === 0) return;

        // Create patrol route
        const patrolPoints = this.generatePatrolRoute(guardPosts);
        
        villager.workTask = {
            type: 'patrol',
            route: patrolPoints,
            currentPoint: 0,
            state: 'patrolling',
            alertness: 1.0,
            lastThreatCheck: Date.now()
        };

        villager.destination = patrolPoints[0];
        villager.state = 'moving';
    }

    static updatePatrol(villager) {
        if (!villager.workTask || villager.workTask.type !== 'patrol') return;

        // Check for threats periodically
        const now = Date.now();
        if (now - villager.workTask.lastThreatCheck > 1000) {
            this.checkForThreats(villager);
            villager.workTask.lastThreatCheck = now;
        }

        // Update patrol movement
        if (villager.state === 'moving') {
            const currentPoint = villager.workTask.route[villager.workTask.currentPoint];
            const distance = BABYLON.Vector3.Distance(villager.mesh.position, currentPoint);

            if (distance < 0.1) {
                // Reached current patrol point
                this.guardPostBehavior(villager);
            }
        } else if (villager.state === 'observing') {
            villager.workTask.observeTime -= this.scene.getEngine().getDeltaTime() * 0.001;
            if (villager.workTask.observeTime <= 0) {
                // Move to next patrol point
                villager.workTask.currentPoint = (villager.workTask.currentPoint + 1) % villager.workTask.route.length;
                villager.destination = villager.workTask.route[villager.workTask.currentPoint];
                villager.state = 'moving';
            }
        }
    }

    static assignMerchantWork(villager) {
        const shops = this.locations.get('shop') || [];
        if (shops.length === 0) return;

        // Find unoccupied shop
        const availableShop = shops.find(shop => 
            !this.villagers.some(v => 
                v.workTask && 
                v.workTask.type === 'trade' && 
                v.workTask.location === shop
            )
        );

        if (availableShop) {
            villager.workTask = {
                type: 'trade',
                location: availableShop,
                inventory: this.generateInventory(),
                customerQueue: [],
                state: 'setting_up'
            };
            villager.destination = availableShop;
            villager.state = 'moving';
        }
    }

    static updateTrading(villager) {
        if (!villager.workTask || villager.workTask.type !== 'trade') return;

        switch (villager.workTask.state) {
            case 'setting_up':
                // Shop setup animation
                villager.workTask.progress = (villager.workTask.progress || 0) + 0.02;
                if (villager.workTask.progress >= 1) {
                    villager.workTask.state = 'trading';
                }
                break;

            case 'trading':
                // Handle customers
                if (villager.workTask.customerQueue.length > 0) {
                    this.processCustomerTransaction(villager);
                } else {
                    // Look for new customers
                    this.attractCustomers(villager);
                }
                break;
        }
    }

    static assignGeneralWork(villager) {
        const tasks = ['cleaning', 'maintaining', 'delivering'];
        const task = tasks[Math.floor(Math.random() * tasks.length)];
        
        switch (task) {
            case 'cleaning':
                this.assignCleaningTask(villager);
                break;
            case 'maintaining':
                this.assignMaintenanceTask(villager);
                break;
            case 'delivering':
                this.assignDeliveryTask(villager);
                break;
        }
    }

    // Helper methods
    static generatePatrolRoute(guardPosts) {
        const route = [...guardPosts];
        // Add some random points between posts
        for (let i = 0; i < route.length - 1; i++) {
            const midPoint = BABYLON.Vector3.Lerp(route[i], route[i + 1], 0.5);
            midPoint.x += (Math.random() - 0.5) * 5;
            midPoint.z += (Math.random() - 0.5) * 5;
            route.splice(i + 1, 0, midPoint);
            i++;
        }
        return route;
    }

    static guardPostBehavior(villager) {
        villager.state = 'observing';
        villager.workTask.observeTime = 5 + Math.random() * 5; // 5-10 seconds
        
        // Rotate to scan area
        const rotationDuration = 2000;
        const startRotation = villager.mesh.rotation.y;
        const totalRotation = Math.PI * 2;
        
        const rotationInterval = setInterval(() => {
            const progress = (Date.now() % rotationDuration) / rotationDuration;
            villager.mesh.rotation.y = startRotation + totalRotation * progress;
        }, 16);

        setTimeout(() => clearInterval(rotationInterval), rotationDuration);
    }

    static checkForThreats(villager) {
        // Check for zombies or suspicious activity
        const threatRadius = 20;
        const threats = this.scene.zombies ? this.scene.zombies.filter(zombie => 
            BABYLON.Vector3.Distance(villager.mesh.position, zombie.position) < threatRadius
        ) : [];

        if (threats.length > 0) {
            // Alert other guards and villagers
            this.raiseAlert(villager, threats[0]);
        }
    }

    static raiseAlert(guard, threat) {
        // Alert nearby guards
        const alertRadius = 30;
        this.villagers.forEach(v => {
            if (v.role === 'guard' && 
                BABYLON.Vector3.Distance(guard.mesh.position, v.mesh.position) < alertRadius) {
                this.respondToThreat(v, threat);
            }
        });

        // Warn nearby villagers
        this.villagers.forEach(v => {
            if (v.role !== 'guard' && 
                BABYLON.Vector3.Distance(guard.mesh.position, v.mesh.position) < alertRadius) {
                this.fleeFromThreat(v, threat);
            }
        });
    }

    static respondToThreat(guard, threat) {
        guard.workTask.state = 'responding';
        guard.destination = threat.position;
        guard.state = 'moving';
    }

    static fleeFromThreat(villager, threat) {
        // Calculate flee direction (opposite of threat)
        const fleeDirection = villager.mesh.position.subtract(threat.position).normalize();
        const fleeDistance = 20;
        villager.destination = villager.mesh.position.add(fleeDirection.scale(fleeDistance));
        villager.state = 'fleeing';
    }

    static getSeasonalCrop() {
        const season = Math.floor((this.gameTime / (30 * 24 * 60)) % 4);
        const crops = {
            0: ['wheat', 'carrots'], // Spring
            1: ['corn', 'tomatoes'], // Summer
            2: ['pumpkins', 'potatoes'], // Fall
            3: ['winter_wheat', 'turnips'] // Winter
        };
        const seasonalCrops = crops[season];
        return seasonalCrops[Math.floor(Math.random() * seasonalCrops.length)];
    }

    static generateInventory() {
        return {
            food: Math.floor(Math.random() * 20) + 10,
            tools: Math.floor(Math.random() * 10) + 5,
            materials: Math.floor(Math.random() * 15) + 5
        };
    }
} 