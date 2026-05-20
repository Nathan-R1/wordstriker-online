package sample;

import javafx.application.Platform;
import javafx.event.EventHandler;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.CheckBox;
import javafx.scene.control.ComboBox;
import javafx.scene.effect.DropShadow;
import javafx.scene.effect.Reflection;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.scene.paint.CycleMethod;
import javafx.scene.paint.LinearGradient;
import javafx.scene.paint.Stop;
import javafx.scene.shape.Ellipse;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.stage.WindowEvent;

import java.io.IOException;
import java.net.InetAddress;


public class MainMenuFXController {

    private int count = 0 ;


    @FXML
    private StackPane stackPaneImage;
    @FXML
    private Button incrementButton;
    @FXML
    private Button switchPaneButton;
    @FXML
    private ComboBox comboBox;

    @FXML
    private CheckBox clientCheckBox;

    public void initialize() {
        // SHAPES AND TEXT SCENE
        // IMAGE
        Image fxImage = new Image(getClass().getResourceAsStream("/image.png"), 100, 100, false, false);
        ImageView selectedImage = new ImageView();
        selectedImage.setImage(fxImage);
        Gui.rotateThis(selectedImage);

        // ELLIPSE
        Stop[] stops = new Stop[] { new Stop(0, Color.DODGERBLUE), new Stop(0.4, Color.LIGHTBLUE), new Stop(1, Color.LIGHTGREEN)};
        Ellipse ellipse = new Ellipse(110, 70);
        ellipse.setFill(new LinearGradient(0, 0, 1, 1, true, CycleMethod.NO_CYCLE, stops));
        ellipse.setEffect(new DropShadow(30, 10, 10, Color.GRAY));
        Gui.rotateThis(ellipse);

        // ROTATION EFFECT
        Text text = new Text("My Shapes");
        text.setFont(new Font("Arial Bold", 24));
        Reflection r = new Reflection();
        r.setFraction(0.8);
        text.setEffect(r);
        Gui.rotateThis(text);

        stackPaneImage.getChildren().addAll(ellipse, text, selectedImage);

        comboBox.getItems().add("localhost");
        comboBox.getSelectionModel().selectFirst();
    }

    @FXML
    private void increment() {
        count++;
        incrementButton.setText("C "+count);
    }

    @FXML
    private void paneswitch() {

        // get the current stage
        Stage stage = (Stage) switchPaneButton.getScene().getWindow();

        // load the game fxml file
        Parent root = null;
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("main.fxml"));
            ConnectionFXController controller = new ConnectionFXController();
            loader.setController(controller);
            root = loader.load();

            boolean CLIENT = clientCheckBox.isSelected();
            controller.connect((String)comboBox.getSelectionModel().getSelectedItem(), CLIENT); //AUTOCONNECT

            StackPane stackPane = new StackPane();
            stackPane.getChildren().addAll(root);

            Scene scene = new Scene(stackPane, Color.BLACK);

            // Swap screen
            stage.setScene(scene);
            stage.setMaximized(true);
            stage.setOnCloseRequest(t -> {
                Platform.exit();
                System.exit(0);
            });
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @FXML
    private void find() {
        // clear and normalize the list
        comboBox.getItems().clear();
        comboBox.getItems().add("localhost");
        comboBox.getSelectionModel().selectFirst(); // local host is selected by default

        final byte[] ip;
        try {
            ip = InetAddress.getLocalHost().getAddress();
        } catch (Exception e) {
            return;     // exit method, otherwise "ip might not have been initialized"
        }

        for(int i=1;i<=254;i++) {
            final int j = i;  // i as non-final variable cannot be referenced from inner class
            // new thread for parallel execution
            new Thread(() -> {
                try {
                    ip[3] = (byte)j;
                    InetAddress address = InetAddress.getByAddress(ip);
                    String output = address.toString().substring(1);
                    if (address.isReachable(1000)) {
                        comboBox.getItems().add(output);
                    } else {
                        System.out.println("Not Reachable: "+output);
                    }
                } catch (Exception e) {
                    System.out.println("Catch: " + e.getMessage());
                }
            }).start();     // dont forget to start the thread
        }

    }
}