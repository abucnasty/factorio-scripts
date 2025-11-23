
## Inventory Transfers

The concept behind the targets is to create a known pointer to the target entity

An entity needs to have an inventory of some kind to pull from and transfer to.

If the source is a machine, then we need to create a handler that will invoke an inventory transfer from the
output slot of the machine into an input slot of the target machine

If the source is a machine and the target is a belt, we don't need to keep track of the items to the belt, we just need need
to allow the transfer to happen.

If the source is a belt, we will need to mock the inventory to be infinite.

All these transactions happen in `State` components.