const {Sequelize} = require('sequelize');


module.exports = function(sequelize) {
    return sequelize.define("positions_table",
    {
        idposition: {type: Sequelize.SMALLINT.UNSIGNED, primaryKey: true},
        art: {type:Sequelize.STRING(100)},
        name: {type:Sequelize.STRING(200)},
        price: {type:Sequelize.SMALLINT.UNSIGNED},
    },
    {
        timestamps: false,
        tablename: 'position',
        freezeTableName: true
    }
    );
}