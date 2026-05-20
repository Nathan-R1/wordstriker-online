module sample {
    requires javafx.controls;
    requires javafx.graphics;
    requires javafx.fxml;
    requires java.desktop;
    requires javafx.swing;
    opens sample ;

    exports sample;
}